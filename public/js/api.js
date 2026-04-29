const API = 'https://nextmusic.toubiec.cn/api'

let token

// 认证：获取 IP → MD5 生成令牌
async function authenticate() {
  const res = await fetch(API + '/getip')
  const body = await res.json()
  if (body.code !== 200 || !body.data?.ip) {
    throw new Error('认证失败: 无法获取 IP')
  }
  token = md5('suxiaoqings:' + body.data.ip)
}

// 通用 API 请求
async function api(path, data) {
  const res = await fetch(API + '/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, token }),
  })
  const body = await res.json()
  if (!res.ok || body.code !== 200) throw new Error(body.message || '请求失败')
  return body
}
