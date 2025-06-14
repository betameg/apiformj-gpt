# 使用官方的 Node.js 18 LTS 镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache \
    curl \
    ca-certificates

# 将 package.json 和 package-lock.json (如果存在) 复制到工作目录
COPY package*.json ./

# 安装项目依赖（使用npm ci进行更快的安装）
RUN npm ci --only=production && npm cache clean --force

# 复制应用程序的其余代码
COPY . .

# 创建用于存储图片的目录并设置权限
# 注意：由于没有创建特定用户，这里将由root用户拥有并设置权限
# 如果需要，可以考虑使用基础镜像中已有的 node 用户 (USER node)
# 但根据要求，所有用户创建和切换的操作都已移除
RUN mkdir -p images && \
    chmod -R 755 /app

# 暴露应用程序运行的端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/ || exit 1

# 定义容器启动时执行的命令
# 容器将以root用户（或基础镜像的默认用户）身份运行此命令
CMD ["node", "server.js"]