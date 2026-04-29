# Music

网易云音乐解析工具，部署在 Cloudflare Pages。

## 文件结构

```
public/
├── index.html          # HTML 结构
├── css/style.css       # 样式
├── js/
│   ├── md5.js          # MD5 实现
│   ├── utils.js        # 工具函数
│   ├── api.js          # API 认证与请求
│   └── app.js          # UI 交互与下载逻辑
functions/
└── download.js         # 音频下载代理
```

## 使用

```bash
npm install
npm run dev     # 本地开发 http://localhost:9001
npm run deploy  # 部署到 Cloudflare Pages
```

## 说明

- 前端直接请求 `nextmusic.toubiec.cn` 的 API，无需后端代理
- 仅保留 `/download` 函数用于转发音频下载（规避防盗链）
