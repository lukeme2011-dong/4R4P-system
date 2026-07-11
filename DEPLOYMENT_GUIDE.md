# 4R4P 责任动力学人才管理系统 - 部署指南

## 一、系统要求

### 1.1 硬件要求

| 环境 | CPU | 内存 | 磁盘 | 网络 |
|------|-----|------|------|------|
| 开发环境 | 2核以上 | 4GB以上 | 20GB以上 | 局域网 |
| 测试环境 | 4核以上 | 8GB以上 | 50GB以上 | 局域网 |
| 生产环境 | 8核以上 | 16GB以上 | 100GB以上 | 公网/内网 |

### 1.2 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 20.x | 运行环境 |
| npm | >= 10.x | 包管理器 |
| SQLite3 | 5.x | 数据库（内置） |
| Docker | >= 20.x | 容器化部署（可选） |
| Docker Compose | >= 2.x | 容器编排（可选） |

---

## 二、单机部署

### 2.1 Windows 单机部署

#### 2.1.1 环境准备

1. **安装 Node.js**
   - 下载地址：https://nodejs.org/
   - 推荐版本：20.x LTS
   - 安装时勾选"Add to PATH"

2. **验证安装**
   ```bash
   node --version   # 输出 v20.x.x
   npm --version    # 输出 10.x.x
   ```

#### 2.1.2 部署步骤

1. **下载项目文件**
   - 将项目文件解压到目标目录，如：`D:\4R4P-System\`

2. **安装后端依赖**
   ```bash
   cd D:\4R4P-System\backend
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd D:\4R4P-System\frontend
   npm install
   ```

4. **启动服务**

   **方式一：使用一键启动脚本**
   ```bash
   # 双击 start.bat 或在命令行运行
   D:\4R4P-System\start.bat
   ```

   **方式二：手动启动**
   ```bash
   # 启动后端（新终端）
   cd D:\4R4P-System\backend
   npm run dev

   # 启动前端（新终端）
   cd D:\4R4P-System\frontend
   npm run dev
   ```

5. **验证服务**
   - 前端访问：http://localhost:5174/
   - 后端健康检查：http://localhost:3001/api/health

#### 2.1.3 一键启动脚本说明

`start.bat` 脚本功能：
- 检查Node.js环境
- 自动启动后端服务（端口3001）
- 等待后端就绪后启动前端服务（端口5174）
- 自动打开浏览器访问前端页面

### 2.2 Linux 单机部署

#### 2.2.1 环境准备

1. **安装 Node.js**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs

   # 验证
   node --version
   npm --version
   ```

2. **安装依赖工具**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y git wget

   # CentOS/RHEL
   sudo yum install -y git wget
   ```

#### 2.2.2 部署步骤

1. **下载项目**
   ```bash
   mkdir -p /opt/4r4p && cd /opt/4r4p
   # 上传项目文件到 /opt/4r4p/
   ```

2. **安装依赖**
   ```bash
   # 后端
   cd /opt/4r4p/backend
   npm install --production

   # 前端
   cd /opt/4r4p/frontend
   npm install --production
   npm run build
   ```

3. **配置环境变量**
   ```bash
   cd /opt/4r4p/backend
   cp .env.example .env  # 如果存在
   # 编辑 .env 文件
   vi .env
   ```

4. **启动服务（使用 pm2）**
   ```bash
   # 安装 pm2
   npm install -g pm2

   # 启动后端
   cd /opt/4r4p/backend
   pm2 start npm --name "4r4p-backend" -- run dev

   # 启动前端（生产模式）
   cd /opt/4r4p/frontend
   pm2 serve dist 5174 --name "4r4p-frontend" --spa
   ```

5. **配置 pm2 开机自启**
   ```bash
   pm2 startup
   pm2 save
   ```

6. **验证服务**
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:5174/
   ```

### 2.3 MacOS 单机部署

#### 2.3.1 环境准备

1. **安装 Node.js**
   ```bash
   # 使用 Homebrew
   brew install node@20

   # 验证
   node --version
   npm --version
   ```

#### 2.3.2 部署步骤

```bash
# 进入项目目录
cd /path/to/4R4P-System

# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 启动服务
# 终端1：后端
cd backend && npm run dev

# 终端2：前端
cd frontend && npm run dev
```

---

## 三、网络部署

### 3.1 网络架构

```
┌─────────────────────────────────────────────┐
│              防火墙/Nginx                   │
│  ┌───────────────────────────────────────┐ │
│  │   端口映射: 80/443 → 5174(前端)       │ │
│  │            端口映射: 3001(后端)        │ │
│  └───────────────────────────────────────┘ │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────┴─────────────────────────┐
│              应用服务器                      │
│  ┌─────────────┐  ┌─────────────┐          │
│  │  Frontend   │  │  Backend    │          │
│  │  :5174      │  │  :3001      │          │
│  └─────────────┘  └──────┬──────┘          │
│                          │                 │
│                    ┌─────┴─────┐           │
│                    │  SQLite   │           │
│                    │  4r4p.db  │           │
│                    └───────────┘           │
└─────────────────────────────────────────────┘
```

### 3.2 Nginx 反向代理配置

#### 3.2.1 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx

# 启动
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 3.2.2 配置反向代理

创建配置文件：
```bash
sudo vi /etc/nginx/sites-available/4r4p.conf
```

配置内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端服务
    location / {
        proxy_pass http://localhost:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/4r4p.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 HTTPS 配置

#### 3.3.1 使用 Let's Encrypt

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动更新证书
sudo certbot renew --dry-run
```

#### 3.3.2 配置文件示例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端服务
    location / {
        proxy_pass http://localhost:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3.4 端口配置

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | HTTP | Nginx反向代理（前端） |
| 443 | HTTPS | Nginx反向代理（前端+后端） |
| 5174 | 前端 | Vue开发服务器/静态资源服务 |
| 3001 | 后端 | Express API服务 |

### 3.5 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --zone=public --add-port=80/tcp --permanent
sudo firewall-cmd --zone=public --add-port=443/tcp --permanent
sudo firewall-cmd --zone=public --add-port=22/tcp --permanent
sudo firewall-cmd --reload
```

---

## 四、Docker 部署

### 4.1 Docker 环境准备

#### 4.1.1 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# CentOS/RHEL
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker-compose --version  # 或 docker compose version
```

#### 4.1.2 创建 Docker 网络

```bash
docker network create 4r4p-network
```

### 4.2 Dockerfile 配置

#### 4.2.1 后端 Dockerfile

**文件路径**: `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npm run build

EXPOSE 3001

VOLUME ["/app/database", "/app/uploads"]

CMD ["npm", "start"]
```

#### 4.2.2 前端 Dockerfile

**文件路径**: `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 4.2.3 前端 Nginx 配置

**文件路径**: `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://backend:3001;
    }
}
```

### 4.3 Docker Compose 配置

**文件路径**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: 4r4p-backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - JWT_SECRET=your-secret-key-here
      - DB_PATH=./database/4r4p.db
    volumes:
      - 4r4p-db:/app/database
      - 4r4p-uploads:/app/uploads
    networks:
      - 4r4p-network
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: 4r4p-frontend
    ports:
      - "5174:80"
    depends_on:
      - backend
    networks:
      - 4r4p-network
    restart: unless-stopped

volumes:
  4r4p-db:
  4r4p-uploads:

networks:
  4r4p-network:
    driver: bridge
```

### 4.4 启动 Docker 容器

#### 4.4.1 构建并启动

```bash
# 构建镜像并启动容器
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看容器状态
docker-compose ps
```

#### 4.4.2 验证服务

```bash
# 后端健康检查
curl http://localhost:3001/api/health

# 前端访问
curl http://localhost:5174/
```

#### 4.4.3 停止服务

```bash
# 停止容器
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 4.5 Docker 部署注意事项

1. **环境变量配置**：在 `docker-compose.yml` 中修改 `JWT_SECRET`
2. **数据持久化**：使用 Docker volumes 保存数据库和上传文件
3. **网络隔离**：使用自定义网络隔离容器
4. **日志管理**：配置日志驱动，便于问题排查
5. **资源限制**：根据服务器配置设置资源限制

---

## 五、环境变量配置

### 5.1 后端环境变量 (.env)

```bash
# 服务端口
PORT=3001

# JWT密钥（生产环境务必修改）
JWT_SECRET=your-strong-secret-key-here

# 数据库路径
DB_PATH=./database/4r4p.db
```

### 5.2 前端环境变量 (.env)

```bash
# 开发环境代理目标
VITE_API_URL=http://localhost:3001
```

### 5.3 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| PORT | 3001 | 后端服务端口 |
| JWT_SECRET | 4r4p_secret_key_2024 | JWT签名密钥 |
| DB_PATH | ./database/4r4p.db | SQLite数据库文件路径 |

---

## 六、数据备份与恢复

### 6.1 手动备份

```bash
# 备份数据库
cp /path/to/4r4p.db /path/to/backup/4r4p_backup_$(date +%Y%m%d).db

# 备份上传文件
tar -czf /path/to/backup/uploads_backup_$(date +%Y%m%d).tar.gz /path/to/uploads/
```

### 6.2 定时备份（Linux）

创建 cron 任务：
```bash
crontab -e
```

添加以下内容：
```bash
# 每日凌晨2点备份数据库
0 2 * * * cp /opt/4r4p/backend/database/4r4p.db /opt/4r4p/backup/4r4p_backup_$(date +\%Y\%m\%d).db

# 每周日凌晨3点备份上传文件
0 3 * * 0 tar -czf /opt/4r4p/backup/uploads_backup_$(date +\%Y\%m\%d).tar.gz /opt/4r4p/backend/uploads/
```

### 6.3 恢复数据

```bash
# 停止服务
pm2 stop 4r4p-backend

# 恢复数据库
cp /path/to/backup/4r4p_backup_YYYYMMDD.db /path/to/4r4p.db

# 恢复上传文件
tar -xzf /path/to/backup/uploads_backup_YYYYMMDD.tar.gz -C /path/to/

# 启动服务
pm2 start 4r4p-backend
```

---

## 七、常见问题

### 7.1 服务启动失败

**问题**：后端服务无法启动
**排查**：
```bash
# 查看日志
cd backend && npm run dev

# 检查端口占用
netstat -tlnp | grep 3001
```

### 7.2 前端无法访问后端 API

**问题**：前端页面显示正常，但无法加载数据
**排查**：
```bash
# 检查后端服务状态
curl http://localhost:3001/api/health

# 检查防火墙
sudo ufw status

# 检查 CORS 配置
# 确保 backend/src/server.ts 中配置了 cors()
```

### 7.3 文件上传失败

**问题**：上传头像时报错
**排查**：
```bash
# 检查上传目录权限
ls -la backend/uploads/

# 检查文件大小限制
# 默认限制为 3MB
```

### 7.4 数据库连接失败

**问题**：后端启动时提示数据库连接失败
**排查**：
```bash
# 检查数据库目录权限
ls -la backend/database/

# 检查数据库文件是否存在
ls -la backend/database/4r4p.db
```

### 7.5 Docker 容器启动失败

**问题**：docker-compose up 失败
**排查**：
```bash
# 查看容器日志
docker-compose logs backend

# 检查 Dockerfile
docker-compose build --no-cache

# 检查端口占用
docker ps -a
```

---

## 八、默认账户

| 角色 | 用户名 | 密码 | 权限说明 |
|------|--------|------|----------|
| 管理员 | admin | admin123 | 全部权限 |
| HR专员 | hr | hr123456 | 测评管理、用户管理等 |

---

## 九、服务管理命令

### 9.1 开发模式

```bash
# 后端
cd backend && npm run dev

# 前端
cd frontend && npm run dev
```

### 9.2 生产模式

```bash
# 后端构建
cd backend && npm run build && npm start

# 前端构建
cd frontend && npm run build && npm run preview
```

### 9.3 PM2 管理

```bash
# 启动
pm2 start npm --name "4r4p-backend" -- run dev

# 查看状态
pm2 status

# 查看日志
pm2 logs 4r4p-backend

# 停止
pm2 stop 4r4p-backend

# 重启
pm2 restart 4r4p-backend

# 删除
pm2 delete 4r4p-backend
```

### 9.4 Docker Compose 管理

```bash
# 启动（后台）
docker-compose up -d

# 启动（前台）
docker-compose up

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it 4r4p-backend bash
```
