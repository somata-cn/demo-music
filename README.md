# Netease Music Pages

极简 Cloudflare Pages 网易云解析页。

保留能力：

- 单曲解析
- 歌单解析
- 单曲下载
- 歌单批量下载

## 结构

```text
public/
  index.html
  app.js
  styles.css
functions/
  api/[[route]].js
  download.js
```

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:9001`。

## 命令

```bash
npm run dev
npm run deploy
```
