# Render 部署指南

## 前提条件
- GitHub 账号
- Render 账号（https://render.com，可用 GitHub 直接登录）

## 部署步骤（共 3 步）

### 第 1 步：推送代码到 GitHub

在本地项目目录中执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit for Render deployment"

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/blueocean-project-mgmt.git

# 推送到 GitHub
git push -u origin main
```

### 第 2 步：在 Render 创建 Blueprint（一键部署）

1. 登录 https://dashboard.render.com
2. 点击左侧 **Blueprints**
3. 点击 **New Blueprint Instance**
4. 选择你刚才推送的 GitHub 仓库 `blueocean-project-mgmt`
5. 给 Blueprint 起个名字，如 `blueocean`
6. 点击 **Apply** —— Render 会自动读取 `render.yaml` 并创建：
   - 一个 PostgreSQL 数据库（免费）
   - 一个 Web Service（免费）
7. 等待部署完成（约 2-3 分钟）

### 第 3 步：初始化数据库

部署完成后：

1. 在 Render Dashboard 点击你的 **Web Service**
2. 点击顶部 **Shell** 标签
3. 依次执行以下命令：

```bash
# 运行数据库迁移
npx drizzle-kit migrate

# 初始化默认数据（3个默认用户 + 合同模板）
npx tsx db/seed.ts
```

4. 完成后，点击顶部 **URL** 即可访问系统

---

## 默认登录账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | `wangshujun` | 空格键 |
| 合同管理员 | `hetong` | 空格键 |
| 项目经理人 | `jingli` | 空格键 |

---

## 常见问题

### 部署后显示 404
- 检查 Web Service 的 **Logs** 标签页是否有错误
- 确保数据库迁移已执行（`npx drizzle-kit migrate`）
- 确保环境变量 `DATABASE_URL` 已正确设置

### 数据库连接错误
- 检查 PostgreSQL 数据库是否创建成功
- 检查 `DATABASE_URL` 环境变量是否正确

### 静态文件（前端页面）不显示
- 确保 `npm run build` 成功执行（生成 `dist/boot.js` 和 `dist/public/`）
- 检查 Web Service 的 Logs 中是否有文件路径错误
