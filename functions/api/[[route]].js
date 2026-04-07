export async function onRequest(context) {
  const { request } = context;
  const { pathname } = new URL(request.url);
  
  // pathname starts with /api/
  const targetPath = pathname.replace('/api/', '');
  const targetUrl = `https://nextmusic.toubiec.cn/api/${targetPath}`;
  
  let reqBody = {};
  if (request.method === 'POST') {
    try {
      reqBody = await request.json();
    } catch (e) {}
  }

  // Add token automatically
  const token = await getMd5Token();
  reqBody.token = token;

  const proxyReq = new Request(targetUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://wyapi.toubiec.cn/'
    },
    body: request.method === 'POST' ? JSON.stringify(reqBody) : null
  });

  const response = await fetch(proxyReq);
  const resBody = await response.text();

  if (response.status === 404) {
    return new Response(JSON.stringify({
      code: 404,
      message: `代理的目标地址 ${targetUrl} 不存在或返回了 404，请确认上游服务正常。`,
      data: null
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(resBody, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function getMd5Token() {
  const t = Math.floor(Date.now() / 60000);
  const str = `suxiaoqings:${t}`;
  const encoder = new TextEncoder();
  // Cloudflare Workers/Pages support MD5 in Web Crypto
  const hashBuffer = await crypto.subtle.digest('MD5', encoder.encode(str));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
