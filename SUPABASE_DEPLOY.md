# Supabase 部署指南（免费，无需信用卡）

## 架构说明

```
电脑A (浏览器) ──┐
                 ├─→ 静态网站 (ok.kimi.link) ──→ Supabase 数据库
电脑B (浏览器) ──┘           ↑
                             │
电脑C (浏览器) ──────────────┘
```

所有数据自动实时同步到 Supabase 云端数据库，不同电脑访问同一网址即可共享数据。

---

## 第 1 步：注册 Supabase（1分钟）

1. 打开 https://supabase.com
2. 点击 **Start your project**
3. 选择 **Continue with GitHub**
4. 授权登录（使用 GitHub 账号）

---

## 第 2 步：创建项目（2分钟）

1. 在 Dashboard 点击 **New project**
2. 填写配置：
   | 项目 | 值 |
   |------|-----|
   | Organization | 选择默认或新建 |
   | Project name | `blueocean-project` |
   | Database Password | 设置一个强密码（记住它！） |
   | Region | `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)` |
3. 点击 **Create new project**
4. 等待项目创建完成（约 1-2 分钟）

---

## 第 3 步：创建数据库表（3分钟）

1. 项目创建完成后，点击左侧 **SQL Editor**
2. 点击 **New query**
3. 复制 `supabase-setup.sql` 文件中的全部内容（或复制下面提供的 SQL）
4. 粘贴到 SQL Editor
5. 点击 **Run** 按钮执行

> 如果提示成功，数据库就创建好了！

---

## 第 4 步：获取 API 密钥（1分钟）

1. 点击左侧 **Project Settings**（齿轮图标）
2. 点击 **API**
3. 复制以下两个值：
   - **Project URL**（格式：`https://xxxxxxxx.supabase.co`）
   - **anon public**（格式：`eyJhbG...`）

---

## 第 5 步：配置前端环境变量

### 方法：在构建时注入环境变量

1. 打开 `/mnt/agents/output/app/.env` 文件
2. 在文件末尾添加（替换为你的实际值）：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb你的anon密钥
```

3. 保存文件

---

## 第 6 步：重新构建并部署

```bash
cd /mnt/agents/output/app
npm run build
```

然后部署。

---

## 验证数据同步

1. 在电脑 A 上打开网站，登录后添加一条数据
2. 在电脑 B 上打开同一网址，刷新页面
3. 如果数据出现，说明 Supabase 同步成功！

---

## 默认登录账号（密码均为空格键）

| 角色 | 用户名 |
|------|--------|
| 超级管理员 | `wangshujun` |
| 合同管理员 | `hetong` |
| 项目经理人 | `jingli` |
