# Netease Music Pages

一个基于 Cloudflare Pages Functions 的网易云音乐解析项目。

项目由两部分组成：

- `public/`：前端页面
- `functions/`：Cloudflare Pages Functions，用来代理接口和下载请求

## 目录

```text
public/
functions/
  api/[[route]].js
  download.js
package.json
README.md
```

## 如何执行

先确保本机已安装 Node.js，然后在项目根目录执行：

```bash
npm install
npm run dev
```

本地启动后访问：

```text
http://localhost:9001
```

## 可用命令

```bash
npm run dev
```

启动 Cloudflare Pages 本地开发环境。

```bash
npm run deploy
```

将 `public/` 部署到 Cloudflare Pages。

## 说明

- 这个项目没有单独的构建步骤
- 前端入口文件是 `public/index.html`
- 接口代理入口是 `functions/api/[[route]].js`
- 下载代理入口是 `functions/download.js`
