import { onRequest as __api___route___js_onRequest } from "D:\\0work\\code\\web\\music\\cloudflare\\functions\\api\\[[route]].js"
import { onRequest as __download_js_onRequest } from "D:\\0work\\code\\web\\music\\cloudflare\\functions\\download.js"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___js_onRequest],
    },
  {
      routePath: "/download",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__download_js_onRequest],
    },
  ]