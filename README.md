# Midjourney 图片生成器

一个功能强大的双模式AI助手，支持Midjourney图片生成和OpenAI智能对话。具备现代化的ChatGPT风格界面、会话管理、本地存储等高级功能。

## ✨ 功能特性

### 🎨 双模式系统
- **MJ画图模式**：使用Midjourney API生成高质量图片
- **AI对话模式**：使用OpenAI兼容API进行智能对话
- **无缝切换**：一键切换不同工作模式

### 💬 智能对话
- **Markdown渲染**：支持代码块、列表、表格等格式化文本
- **思考过程**：自动识别并折叠AI思考过程，可展开查看
- **消息编辑**：用户和AI消息都可编辑
- **重新生成**：AI回复支持重新生成功能

### 🗂️ 会话管理
- **会话历史**：完整的对话历史记录
- **智能标题**：AI自动生成对话标题
- **对话总结**：一键生成对话摘要
- **模式分类**：不同模式的对话分别管理

### ⚙️ 灵活配置
- **API配置**：支持自定义OpenAI、NewAPI、One-API等服务
- **模型选择**：自动获取并选择可用模型
- **连接测试**：实时验证API配置
- **本地存储**：所有数据存储在浏览器本地

### 🎯 用户体验
- **现代界面**：ChatGPT风格的现代化设计
- **响应式布局**：完美支持桌面和移动设备
- **数据管理**：支持数据导入导出
- **认证保护**：访问密码保护

## 🚀 快速开始

### 本地开发

#### 环境要求
- Node.js 18+ 
- npm 或 yarn

#### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd midjourney-generator
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 访问密码
ACCESS_CODE=your-access-code

# Midjourney API配置
MJ_API_SECRET=your-mj-api-secret

# OpenAI API配置（可选）
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# 服务端口
PORT=3001
```

4. **启动服务**
```bash
npm start
```

5. **访问应用**
打开浏览器访问 `http://localhost:3001`

### Docker 部署

#### 使用 Docker Compose（推荐）

1. **准备配置文件**
```bash
cp .env.example .env
# 编辑 .env 文件配置你的API密钥
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **查看日志**
```bash
docker-compose logs -f
```

4. **停止服务**
```bash
docker-compose down
```

#### 使用 Docker

1. **构建镜像**
```bash
docker build -t midjourney-generator .
```

2. **运行容器**
```bash
docker run -d \
  --name midjourney-app \
  -p 3001:3001 \
  -v $(pwd)/images:/app/images \
  -e ACCESS_CODE=your-access-code \
  -e MJ_API_SECRET=your-mj-api-secret \
  midjourney-generator
```

## 📖 使用教程

### 首次使用

1. **访问应用**：打开浏览器访问部署地址
2. **输入密码**：使用配置的ACCESS_CODE进行认证
3. **配置API**：点击左下角设置按钮配置API密钥

### MJ画图模式

1. **切换模式**：在左侧边栏选择"🎨 MJ画图"
2. **输入描述**：在底部输入框描述你想要的图片
3. **生成图片**：点击"生成图片"按钮
4. **操作图片**：使用U1-U4放大，V1-V4变化
5. **下载图片**：点击下载按钮保存图片

### AI对话模式

1. **切换模式**：在左侧边栏选择"💬 AI对话"
2. **配置模型**：在设置中选择对话模型
3. **开始对话**：输入问题开始智能对话
4. **编辑消息**：悬停消息可编辑内容
5. **重新生成**：点击🔄重新生成AI回复

### 会话管理

- **新建对话**：点击"新对话"按钮
- **切换对话**：点击历史对话列表
- **总结对话**：点击"总结对话"按钮
- **导出数据**：在设置中导出所有数据

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `ACCESS_CODE` | 访问密码 | `your-access-code` | 是 |
| `MJ_API_SECRET` | Midjourney API密钥 | - | 是 |
| `OPENAI_API_KEY` | OpenAI API密钥 | - | 否 |
| `OPENAI_API_URL` | OpenAI API地址 | `https://api.openai.com/v1/chat/completions` | 否 |
| `PORT` | 服务端口 | `3001` | 否 |

### API配置

#### Midjourney API
- **MJ服务域名**：输入完整的服务域名
- **MJ API Secret**：从服务提供商获取的密钥
- **测试连接**：验证配置是否正确

#### OpenAI API
- **API基础URL**：支持官方API和第三方代理
- **API Key**：OpenAI或兼容服务的密钥
- **默认模型**：选择对话使用的模型
- **获取模型**：自动获取可用模型列表

### 第三方API服务

支持以下OpenAI兼容服务：
- [NewAPI](https://github.com/Calcium-Ion/new-api)
- [One-API](https://github.com/songquanpeng/one-api)
- [FastGPT](https://github.com/labring/FastGPT)
- 其他OpenAI兼容服务

## 🏗️ 项目结构

```
midjourney-generator/
├── public/                 # 前端静态文件
│   └── index.html         # 主页面
├── images/                # 图片存储目录
├── server.js              # 后端服务器
├── package.json           # 项目配置
├── Dockerfile             # Docker镜像配置
├── docker-compose.yml     # Docker Compose配置
├── .env.example           # 环境变量示例
└── README.md              # 项目文档
```

### 技术栈

**前端**
- 原生HTML/CSS/JavaScript
- Marked.js（Markdown渲染）
- Highlight.js（代码高亮）

**后端**
- Node.js
- Express.js
- 文件系统存储

**部署**
- Docker
- Docker Compose

## 🔧 开发指南

### 本地开发

1. **启动开发服务器**
```bash
npm run dev
```

2. **代码格式化**
```bash
npm run format
```

3. **代码检查**
```bash
npm run lint
```

### 构建部署

1. **构建Docker镜像**
```bash
docker build -t midjourney-generator:latest .
```

2. **推送到仓库**
```bash
docker tag midjourney-generator:latest your-registry/midjourney-generator:latest
docker push your-registry/midjourney-generator:latest
```

## ❓ 常见问题

### Q: 认证失败怎么办？
A: 检查ACCESS_CODE环境变量是否正确配置，确保与.env文件中的值一致。

### Q: 图片生成失败？
A: 检查MJ_API_SECRET是否正确，测试API连接是否成功。

### Q: AI对话无响应？
A: 检查OpenAI API配置，确保API密钥有效且有足够余额。

### Q: 模型列表为空？
A: 点击"测试连接"验证API配置，确保网络连接正常。

### Q: 数据丢失怎么办？
A: 数据存储在浏览器本地，定期使用"导出数据"功能备份。

### Q: Docker部署问题？
A: 检查端口占用，确保.env文件配置正确，查看容器日志排查问题。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请提交Issue或联系开发者。
