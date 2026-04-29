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
```

## 使用

```bash
npm install
npm run dev     # 本地开发 http://localhost:9001
npm run deploy  # 部署到 Cloudflare Pages
```

## 说明

- 前端内置多个音乐 API 候选源，启动时会检查可用性，可手动选择当前使用的接口
- 下载逻辑在前端完成：优先使用 Blob 下载，跨域失败时退回直接链接下载
