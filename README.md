# NextMusic-CF

[![Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-f38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**NextMusic-CF** 是一款高颜值的网易云音乐“单曲解析”与“歌单可视化批量下载”工具。
本项目从 Python 工具重构演变而来，专为 **Cloudflare Pages** 平台设计打造。全前端极光玻璃拟态 UI 渲染，后端通过强大的 Cloudflare Edge Network 搭建防封拦截与跨域解析体系。

## ✨ 核心特性

- 🎨 **前卫的美学设计** - 采用玻璃拟态（Glassmorphism）、微动画与紫蓝渐变构建深色呼吸视效。
- 🎵 **双模式无损音乐解析下载** - 一键切换**单曲解析**与**歌单解析**形态，从标准到 Hi-Res 音质一应俱全。
- 📦 **全景歌单打包拉取** - 支持对热门歌单直接进行结构化预览，搭配**一键队列下载**功能自动化遍历批量下载！
- 🛡️ **安全反解析网关** - Web 端自带 MD5 Token 时间戳混淆；基于 Cloudflare Functions `[[route]].js` 作为 Serverless 后端阻断一切 CORS 报错及直链下发跨域拦截。

## ⚙️ 部署及在本地运行

本项目使用标准 Cloudflare Pages 架构存放于 `public/` 及 `functions/`。

### 安装依赖 (可选推荐)
你需要通过 `npm` 自动下载并开启 wrangler：
```bash
npm install
```

### 1. 本地启动开发与测试
在项目根目录运行环境仿真：
```bash
npm run dev
# 或直接通过 npx:
npx wrangler pages dev public
```
命令执行完毕后，打开 `http://localhost:8788` 即可开始测试音乐获取！

### 2. 🚀 一键部署到线上环境
将此代码库极速发布到您的 Cloudflare Pages：
```bash
npm run deploy
```
*发布过程中您可能会被求登录并授权 Cloudflare 账户。*

## 📁 目录结构

```text
├── public/                 # 静态挂载页面目录
│   └── index.html          # 视觉面板及歌曲抓取流核心执行逻辑
├── functions/              # Cloudflare Pages 云函数
│   ├── api/
│   │   └── [[route]].js    # API 接口鉴权与伪装请求分发
│   └── download.js         # 直链资源数据流中继 (反防盗链下载器)
├── wrangler.toml           # Wrangler 管理配置信息
└── package.json            # 辅助 NPM 包指令配置
```

## 📜 许可证

开源声明：本项目所有代码依据 [MIT License](LICENSE) 发布。仅作学习用途使用与探讨，下载解析后果由使用者自发承担。
