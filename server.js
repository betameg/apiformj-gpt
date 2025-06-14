require('dotenv').config(); // 在文件顶部加载环境变量
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const fs = require('fs').promises; // 引入 fs.promises 模块

const app = express();
const port = process.env.PORT || 3000; // 从环境变量读取端口，或使用默认值

// 从环境变量读取 API 密钥和 URL
let MJ_API_SECRET = process.env.MJ_API_SECRET || 'sk-xxx'; // 请替换为您的实际密钥
let IMAGINE_URL = process.env.IMAGINE_URL ;
let FETCH_URL_BASE = process.env.FETCH_URL_BASE;
let ACTION_URL = process.env.ACTION_URL; // 添加 action URL
const ACCESS_CODE = process.env.ACCESS_CODE || 'your-access-code'; // 客户端访问密码

// OpenAI API 配置
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
let OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// 内存存储（生产环境建议使用数据库）
const conversations = new Map(); // Map<conversationId, conversation>
const userSettings = new Map(); // Map<userId, settings>

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // 提供静态文件

// 存储每个IP的认证失败次数和冷却时间
const authCoolDown = new Map(); // Map<ip, { failures: number, coolDownUntil: Date }>
const MAX_AUTH_FAILURES = 3;
const AUTH_COOL_DOWN_TIME_MS = 10 * 60 * 1000; // 10分钟

// 认证路由
app.post('/auth', (req, res) => {
    const clientIp = req.ip;
    let coolDownInfo = authCoolDown.get(clientIp) || { failures: 0, coolDownUntil: new Date(0) };

    if (coolDownInfo.coolDownUntil > new Date()) {
        const remainingTime = Math.ceil((coolDownInfo.coolDownUntil.getTime() - new Date().getTime()) / 1000 / 60);
        return res.status(429).json({ success: false, error: `Too many authentication attempts. Please try again in ${remainingTime} minutes.` });
    }

    const { password } = req.body;
    if (password === ACCESS_CODE) {
        // 认证成功，重置失败计数
        authCoolDown.set(clientIp, { failures: 0, coolDownUntil: new Date(0) });
        res.json({ success: true, message: 'Authentication successful' });
    } else {
        // 认证失败，增加失败计数
        coolDownInfo.failures++;
        if (coolDownInfo.failures >= MAX_AUTH_FAILURES) {
            coolDownInfo.coolDownUntil = new Date(Date.now() + AUTH_COOL_DOWN_TIME_MS);
            coolDownInfo.failures = 0; // 重置计数
        }
        authCoolDown.set(clientIp, coolDownInfo);
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

// 存储每个IP的请求失败次数和冷却时间
const requestCoolDown = new Map(); // Map<ip, { failures: number, coolDownUntil: Date }>
const MAX_FAILURES = 3;
const COOL_DOWN_TIME_MS = 10 * 60 * 1000; // 10分钟

// 辅助函数：提交任务并轮询结果
async function submitAndPollTask(url, body) {
    const submitResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'accept': '*/*',
            'accept-language': 'zh-CN,zh;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'mj-api-secret': MJ_API_SECRET,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(body)
    });

    const submitData = await submitResponse.json();

    if (submitData.code !== 1) {
        throw new Error(submitData.description || 'Failed to submit task');
    }

    const taskId = submitData.result;
    let imageUrl = '';
    let status = '';
    let buttons = [];

    // 循环查询任务状态直到完成
    while (status !== 'SUCCESS' && status !== 'FAILURE') {
        const fetchResponse = await fetch(`${FETCH_URL_BASE}${taskId}/fetch`, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'cache-control': 'no-cache',
                'content-type': 'application/json',
                'mj-api-secret': MJ_API_SECRET,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
            }
        });
        const fetchData = await fetchResponse.json();

        status = fetchData.status;
        imageUrl = fetchData.imageUrl;
        buttons = fetchData.buttons || [];

        if (status === 'FAILURE') {
            throw new Error(fetchData.failReason || 'Task failed');
        }

        if (status !== 'SUCCESS') {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒后再次查询
        }
    }
    return { imageUrl, buttons, taskId };
}

app.post('/generate-image', async (req, res) => {
    const clientIp = req.ip;
    let coolDownInfo = requestCoolDown.get(clientIp) || { failures: 0, coolDownUntil: new Date(0) };

    if (coolDownInfo.coolDownUntil > new Date()) {
        const remainingTime = Math.ceil((coolDownInfo.coolDownUntil.getTime() - new Date().getTime()) / 1000 / 60);
        return res.status(429).json({ error: `Too many requests. Please try again in ${remainingTime} minutes.` });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const { imageUrl, buttons, taskId } = await submitAndPollTask(IMAGINE_URL, {
            base64Array: [],
            notifyHook: "",
            prompt: prompt,
            state: "",
            botType: "MID_JOURNEY"
        });
        // 成功后重置失败计数
        requestCoolDown.set(clientIp, { failures: 0, coolDownUntil: new Date(0) });
        res.json({ imageUrl, buttons, taskId });
        // 调用保存图片函数
        if (imageUrl) {
            try {
                await saveImageLocally(imageUrl);
                console.log(`Image saved locally: ${imageUrl}`);
            } catch (saveError) {
                console.error('Error saving image locally:', saveError.message);
            }
        }
    } catch (error) {
        console.error('Error in generate-image:', error.message);
        // 失败时增加失败计数
        coolDownInfo.failures++;
        if (coolDownInfo.failures >= MAX_FAILURES) {
            coolDownInfo.coolDownUntil = new Date(Date.now() + COOL_DOWN_TIME_MS);
            coolDownInfo.failures = 0; // 重置计数
        }
        requestCoolDown.set(clientIp, coolDownInfo);
        res.status(500).json({ error: error.message });
    }
});

app.post('/perform-action', async (req, res) => {
    const clientIp = req.ip;
    let coolDownInfo = requestCoolDown.get(clientIp) || { failures: 0, coolDownUntil: new Date(0) };

    if (coolDownInfo.coolDownUntil > new Date()) {
        const remainingTime = Math.ceil((coolDownInfo.coolDownUntil.getTime() - new Date().getTime()) / 1000 / 60);
        return res.status(429).json({ error: `Too many requests. Please try again in ${remainingTime} minutes.` });
    }

    const { customId, taskId } = req.body;

    if (!customId || !taskId) {
        return res.status(400).json({ error: 'CustomId and taskId are required' });
    }

    try {
        const { imageUrl, buttons, taskId: newTaskId } = await submitAndPollTask(ACTION_URL, {
            customId: customId,
            taskId: taskId,
            botType: "MID_JOURNEY"
        });
        // 成功后重置失败计数
        requestCoolDown.set(clientIp, { failures: 0, coolDownUntil: new Date(0) });
        res.json({ imageUrl, buttons, taskId: newTaskId });
        // 调用保存图片函数
        if (imageUrl) {
            try {
                await saveImageLocally(imageUrl);
                console.log(`Image saved locally: ${imageUrl}`);
            } catch (saveError) {
                console.error('Error saving image locally:', saveError.message);
            }
        }
    } catch (error) {
        console.error('Error in perform-action:', error.message);
        // 失败时增加失败计数
        coolDownInfo.failures++;
        if (coolDownInfo.failures >= MAX_FAILURES) {
            coolDownInfo.coolDownUntil = new Date(Date.now() + COOL_DOWN_TIME_MS);
            coolDownInfo.failures = 0; // 重置计数
        }
        requestCoolDown.set(clientIp, coolDownInfo);
        res.status(500).json({ error: error.message });
    }
});


// 新增图片下载路由
app.get('/download-image', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required.');
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // 尝试从 Content-Type 获取文件扩展名
        let contentType = response.headers.get('content-type');
        let extension = '.png'; // 默认后缀名
        if (contentType && contentType.includes('image/jpeg')) {
            extension = '.jpg';
        } else if (contentType && contentType.includes('image/gif')) {
            extension = '.gif';
        } else if (contentType && contentType.includes('image/webp')) {
            extension = '.webp';
        }

        // 从 URL 中提取文件名，并确保有后缀
        let filename = path.basename(new URL(imageUrl).pathname);
        if (!filename.includes('.')) { // 如果文件名没有后缀，则添加
            filename += extension;
        } else {
            // 如果有后缀，但不是常见的图片后缀，也尝试替换
            const currentExt = path.extname(filename);
            if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(currentExt.toLowerCase())) {
                filename = filename.replace(currentExt, extension);
            }
        }

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType || 'application/octet-stream');
        response.body.pipe(res); // 使用流式传输
    } catch (error) {
        console.error('Error downloading image:', error.message);
        res.status(500).send('Failed to download image.');
    }
});

// 辅助函数：保存图片到本地
async function saveImageLocally(imageUrl) {
    const imagesDir = path.join(__dirname, 'images');
    await fs.mkdir(imagesDir, { recursive: true }); // 确保 images 目录存在

    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image for saving: ${response.statusText}`);
    }

    let contentType = response.headers.get('content-type');
    let extension = '.png';
    if (contentType && contentType.includes('image/jpeg')) {
        extension = '.jpg';
    } else if (contentType && contentType.includes('image/gif')) {
        extension = '.gif';
    } else if (contentType && contentType.includes('image/webp')) {
        extension = '.webp';
    }

    let filename = path.basename(new URL(imageUrl).pathname);
    if (!filename.includes('.')) {
        filename += extension;
    } else {
        const currentExt = path.extname(filename);
        if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(currentExt.toLowerCase())) {
            filename = filename.replace(currentExt, extension);
        }
    }

    const imagePath = path.join(imagesDir, filename);
    const buffer = await response.buffer();
    await fs.writeFile(imagePath, buffer);
}

// OpenAI模型管理API
app.get('/api/openai/models', async (req, res) => {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');
    const baseUrl = req.headers['base-url'] || 'https://api.openai.com';
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/v1/models`;

    if (!apiKey) {
        return res.status(400).json({ error: 'OpenAI API key required' });
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Raw models data:', data);

            // 过滤出聊天模型
            const allModels = data.data || [];
            const chatModels = allModels.filter(model => {
                const modelId = model.id.toLowerCase();
                return (
                    modelId.includes('gpt') ||
                    modelId.includes('claude') ||
                    modelId.includes('chat') ||
                    modelId.includes('llama') ||
                    modelId.includes('qwen') ||
                    modelId.includes('deepseek') ||
                    modelId.includes('gemini') ||
                    modelId.includes('mistral') ||
                    modelId.includes('yi-') ||
                    modelId.includes('baichuan') ||
                    modelId.includes('chatglm')
                ) && !modelId.includes('embedding') && !modelId.includes('whisper');
            });

            console.log(`Filtered ${chatModels.length} chat models from ${allModels.length} total models`);
            console.log('Chat models:', chatModels.map(m => m.id));

            res.json({ models: chatModels });
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('Failed to fetch OpenAI models:', error);
        res.status(500).json({ error: 'Failed to fetch models', details: error.message });
    }
});

// API连接测试
app.post('/api/test-connection', async (req, res) => {
    const { type, config } = req.body;

    try {
        if (type === 'openai') {
            const { apiKey, baseUrl } = config;
            if (!apiKey) {
                return res.status(400).json({ error: 'API Key is required' });
            }

            const testUrl = `${baseUrl.replace(/\/$/, '')}/v1/models`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10秒超时
            });

            if (response.ok) {
                const data = await response.json();
                const modelCount = data.data?.length || 0;
                res.json({
                    success: true,
                    message: `连接成功！发现 ${modelCount} 个可用模型`,
                    details: { modelCount, status: response.status }
                });
            } else {
                const errorData = await response.json().catch(() => ({}));
                res.json({
                    success: false,
                    message: `连接失败：${response.status} ${response.statusText}`,
                    details: errorData
                });
            }
        } else if (type === 'midjourney') {
            const { apiSecret, domain } = config;
            if (!apiSecret || !domain) {
                return res.status(400).json({ error: 'API Secret and Domain are required' });
            }

            // 测试MJ API连接 - 尝试获取任务状态（使用一个不存在的任务ID来测试连接）
            const testUrl = `${domain.replace(/\/$/, '')}/mj/task/test-connection-123456/fetch`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'mj-api-secret': apiSecret,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            // MJ API即使任务不存在也会返回结构化响应，我们检查是否能正常通信
            if (response.status === 200 || response.status === 404) {
                res.json({
                    success: true,
                    message: '连接成功！MJ API服务正常',
                    details: { status: response.status }
                });
            } else if (response.status === 401 || response.status === 403) {
                res.json({
                    success: false,
                    message: 'API密钥验证失败，请检查MJ API Secret',
                    details: { status: response.status }
                });
            } else {
                res.json({
                    success: false,
                    message: `连接失败：${response.status} ${response.statusText}`,
                    details: { status: response.status }
                });
            }
        } else {
            res.status(400).json({ error: 'Invalid test type' });
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        res.json({
            success: false,
            message: `连接测试失败：${error.message}`,
            details: { error: error.name, message: error.message }
        });
    }
});

// OpenAI API 代理
app.post('/api/chat/completions', async (req, res) => {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');
    const baseUrl = req.headers['base-url'] || 'https://api.openai.com';
    const apiUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

    if (!apiKey) {
        return res.status(400).json({ error: 'OpenAI API key not configured' });
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (response.ok) {
            res.json(data);
        } else {
            res.status(response.status).json(data);
        }
    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ error: 'Failed to call OpenAI API', details: error.message });
    }
});

// 提供 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});