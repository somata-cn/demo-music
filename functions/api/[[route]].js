const API_BASE_URL = 'https://nextmusic.toubiec.cn/api/';
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://wyapi.toubiec.cn/'
};

export async function onRequest({ request }) {
  const source = new URL(request.url);
  const target = buildTargetUrl(source);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: HEADERS,
      body: await buildBody(request)
    });

    if (upstream.status === 404) {
      return json({ code: 404, message: `Upstream endpoint not found: ${target}`, data: null }, 404);
    }

    return new Response(await upstream.text(), {
      status: normalizeStatus(upstream.status, 200),
      headers: cors({ 'Content-Type': 'application/json;charset=UTF-8' })
    });
  } catch (error) {
    return json({ code: 502, message: 'Upstream request failed', error: error.message }, 502);
  }
}

function buildTargetUrl(source) {
  const route = source.pathname.replace(/^\/api\//, '');
  const targetUrl = new URL(route, API_BASE_URL);

  source.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  return targetUrl.toString();
}

async function buildBody(request) {
  if (request.method !== 'POST') {
    return null;
  }

  const payload = await request.json().catch(() => ({}));
  payload.token = await createToken();
  return JSON.stringify(payload);
}

async function createToken() {
  return md5(`suxiaoqings:${Math.floor(Date.now() / 60000)}`);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status: normalizeStatus(status, 200),
    headers: cors({ 'Content-Type': 'application/json;charset=UTF-8' })
  });
}

function cors(headers = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    ...headers
  };
}

function normalizeStatus(status, fallback) {
  return Number.isInteger(status) && status >= 200 && status <= 599 ? status : fallback;
}

function md5(input) {
  const bytes = new TextEncoder().encode(input);
  const blocks = [];

  for (let index = 0; index < bytes.length; index += 1) {
    blocks[index >> 2] = (blocks[index >> 2] || 0) | (bytes[index] << ((index % 4) * 8));
  }

  blocks[bytes.length >> 2] = (blocks[bytes.length >> 2] || 0) | (0x80 << ((bytes.length % 4) * 8));
  blocks[(((bytes.length + 8) >>> 6) << 4) + 14] = bytes.length * 8;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let index = 0; index < blocks.length; index += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = ff(a, b, c, d, blocks[index + 0] || 0, 7, -680876936);
    d = ff(d, a, b, c, blocks[index + 1] || 0, 12, -389564586);
    c = ff(c, d, a, b, blocks[index + 2] || 0, 17, 606105819);
    b = ff(b, c, d, a, blocks[index + 3] || 0, 22, -1044525330);
    a = ff(a, b, c, d, blocks[index + 4] || 0, 7, -176418897);
    d = ff(d, a, b, c, blocks[index + 5] || 0, 12, 1200080426);
    c = ff(c, d, a, b, blocks[index + 6] || 0, 17, -1473231341);
    b = ff(b, c, d, a, blocks[index + 7] || 0, 22, -45705983);
    a = ff(a, b, c, d, blocks[index + 8] || 0, 7, 1770035416);
    d = ff(d, a, b, c, blocks[index + 9] || 0, 12, -1958414417);
    c = ff(c, d, a, b, blocks[index + 10] || 0, 17, -42063);
    b = ff(b, c, d, a, blocks[index + 11] || 0, 22, -1990404162);
    a = ff(a, b, c, d, blocks[index + 12] || 0, 7, 1804603682);
    d = ff(d, a, b, c, blocks[index + 13] || 0, 12, -40341101);
    c = ff(c, d, a, b, blocks[index + 14] || 0, 17, -1502002290);
    b = ff(b, c, d, a, blocks[index + 15] || 0, 22, 1236535329);

    a = gg(a, b, c, d, blocks[index + 1] || 0, 5, -165796510);
    d = gg(d, a, b, c, blocks[index + 6] || 0, 9, -1069501632);
    c = gg(c, d, a, b, blocks[index + 11] || 0, 14, 643717713);
    b = gg(b, c, d, a, blocks[index + 0] || 0, 20, -373897302);
    a = gg(a, b, c, d, blocks[index + 5] || 0, 5, -701558691);
    d = gg(d, a, b, c, blocks[index + 10] || 0, 9, 38016083);
    c = gg(c, d, a, b, blocks[index + 15] || 0, 14, -660478335);
    b = gg(b, c, d, a, blocks[index + 4] || 0, 20, -405537848);
    a = gg(a, b, c, d, blocks[index + 9] || 0, 5, 568446438);
    d = gg(d, a, b, c, blocks[index + 14] || 0, 9, -1019803690);
    c = gg(c, d, a, b, blocks[index + 3] || 0, 14, -187363961);
    b = gg(b, c, d, a, blocks[index + 8] || 0, 20, 1163531501);
    a = gg(a, b, c, d, blocks[index + 13] || 0, 5, -1444681467);
    d = gg(d, a, b, c, blocks[index + 2] || 0, 9, -51403784);
    c = gg(c, d, a, b, blocks[index + 7] || 0, 14, 1735328473);
    b = gg(b, c, d, a, blocks[index + 12] || 0, 20, -1926607734);

    a = hh(a, b, c, d, blocks[index + 5] || 0, 4, -378558);
    d = hh(d, a, b, c, blocks[index + 8] || 0, 11, -2022574463);
    c = hh(c, d, a, b, blocks[index + 11] || 0, 16, 1839030562);
    b = hh(b, c, d, a, blocks[index + 14] || 0, 23, -35309556);
    a = hh(a, b, c, d, blocks[index + 1] || 0, 4, -1530992060);
    d = hh(d, a, b, c, blocks[index + 4] || 0, 11, 1272893353);
    c = hh(c, d, a, b, blocks[index + 7] || 0, 16, -155497632);
    b = hh(b, c, d, a, blocks[index + 10] || 0, 23, -1094730640);
    a = hh(a, b, c, d, blocks[index + 13] || 0, 4, 681279174);
    d = hh(d, a, b, c, blocks[index + 0] || 0, 11, -358537222);
    c = hh(c, d, a, b, blocks[index + 3] || 0, 16, -722521979);
    b = hh(b, c, d, a, blocks[index + 6] || 0, 23, 76029189);
    a = hh(a, b, c, d, blocks[index + 9] || 0, 4, -640364487);
    d = hh(d, a, b, c, blocks[index + 12] || 0, 11, -421815835);
    c = hh(c, d, a, b, blocks[index + 15] || 0, 16, 530742520);
    b = hh(b, c, d, a, blocks[index + 2] || 0, 23, -995338651);

    a = ii(a, b, c, d, blocks[index + 0] || 0, 6, -198630844);
    d = ii(d, a, b, c, blocks[index + 7] || 0, 10, 1126891415);
    c = ii(c, d, a, b, blocks[index + 14] || 0, 15, -1416354905);
    b = ii(b, c, d, a, blocks[index + 5] || 0, 21, -57434055);
    a = ii(a, b, c, d, blocks[index + 12] || 0, 6, 1700485571);
    d = ii(d, a, b, c, blocks[index + 3] || 0, 10, -1894986606);
    c = ii(c, d, a, b, blocks[index + 10] || 0, 15, -1051523);
    b = ii(b, c, d, a, blocks[index + 1] || 0, 21, -2054922799);
    a = ii(a, b, c, d, blocks[index + 8] || 0, 6, 1873313359);
    d = ii(d, a, b, c, blocks[index + 15] || 0, 10, -30611744);
    c = ii(c, d, a, b, blocks[index + 6] || 0, 15, -1560198380);
    b = ii(b, c, d, a, blocks[index + 13] || 0, 21, 1309151649);
    a = ii(a, b, c, d, blocks[index + 4] || 0, 6, -145523070);
    d = ii(d, a, b, c, blocks[index + 11] || 0, 10, -1120210379);
    c = ii(c, d, a, b, blocks[index + 2] || 0, 15, 718787259);
    b = ii(b, c, d, a, blocks[index + 9] || 0, 21, -343485551);

    a = add32(a, aa);
    b = add32(b, bb);
    c = add32(c, cc);
    d = add32(d, dd);
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

function cmn(q, a, b, x, s, t) {
  return add32(rotateLeft(add32(add32(a, q), add32(x, t)), s), b);
}

function ff(a, b, c, d, x, s, t) {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
}

function rotateLeft(value, shift) {
  return (value << shift) | (value >>> (32 - shift));
}

function add32(a, b) {
  return (a + b) | 0;
}

function toHex(value) {
  let hex = '';

  for (let index = 0; index < 4; index += 1) {
    hex += ((value >>> (index * 8)) & 255).toString(16).padStart(2, '0');
  }

  return hex;
}
