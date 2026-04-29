// 候选接口分三类：
// - nextmusic：当前项目原始接口，字段最贴合页面现有数据结构
// - ncm：Binaryify/NeteaseCloudMusicApi 兼容接口，需要做字段转换
// - meting：Meting 风格接口，适合做兜底，但歌单信息和音质能力较弱
const API_PROVIDERS = [
  { name: 'NextMusic', type: 'nextmusic', base: 'https://nextmusic.toubiec.cn/api' },
  { name: 'NeteaseCloudMusicApi', type: 'ncm', base: 'https://netease-cloud-music-api-iota-mocha.vercel.app' },
  { name: 'Meting mo-app', type: 'meting', base: 'https://metingapi.mo-app.cn/' },
  { name: 'Meting nanorocky', type: 'meting', base: 'https://metingapi.nanorocky.top/' },
  { name: 'Meting injahow', type: 'meting', base: 'https://api.injahow.cn/meting/' },
  { name: 'Meting amarea', type: 'meting', base: 'https://api.amarea.cn/meting/' },
  { name: 'Meting kanokano', type: 'meting', base: 'https://api.kanokano.cn/meting/' },
  { name: 'Meting onlyzyx', type: 'meting', base: 'https://service.onlyzyx.com/meting-api/' },
]

// 健康检查只验证“服务能响应且能返回基本歌曲数据”，不代表所有歌曲都有下载地址。
const HEALTH_SONG_ID = '186016'
const REQUEST_TIMEOUT = 8000

let activeProvider
let apiStatuses = []
let tokenByProvider = new Map()

// 重新检查所有候选接口，并自动选择第一个可用接口。
async function authenticate() {
  apiStatuses = await checkApiProviders()
  const activeStatus = apiStatuses.find(status => status.ok)
  if (!activeStatus) {
    throw new Error('所有接口均不可用')
  }

  activeProvider = activeStatus.provider
  return getApiStatus()
}

// 对页面暴露的统一请求入口。调用方仍然只关心 getSongInfo/getSongUrl/getPlaylist，
// 具体接口差异在下面的 provider adapter 中消化。
async function api(path, data) {
  if (!activeProvider) await authenticate()

  const providers = sortedProviders()
  let lastError

  for (const provider of providers) {
    try {
      const result = await requestByProvider(provider, path, data)
      activeProvider = provider
      return result
    } catch (err) {
      lastError = err
      if (isProviderLevelError(err)) markProviderFailed(provider, err)
    }
  }

  // 下载地址缺失通常是版权、音质或上游策略导致，不等同于接口不可用。
  if (path === 'getSongUrl') {
    return { code: 200, data: { id: data.id, url: '' } }
  }

  throw lastError || new Error('请求失败')
}

function getApiStatus() {
  const available = apiStatuses.filter(status => status.ok).length
  return {
    active: activeProvider,
    available,
    total: API_PROVIDERS.length,
    list: apiStatuses,
  }
}

function selectApiProvider(base) {
  const status = apiStatuses.find(item => item.provider.base === base)
  if (!status) throw new Error('接口不存在')
  if (!status.ok) throw new Error('接口不可用')

  activeProvider = status.provider
  return getApiStatus()
}

async function checkApiProviders() {
  return Promise.all(API_PROVIDERS.map(async provider => {
    try {
      const auth = await checkProvider(provider)
      return { provider, ok: true, auth }
    } catch (err) {
      return { provider, ok: false, error: err.message || '不可用' }
    }
  }))
}

async function checkProvider(provider) {
  // 每类接口使用最便宜、最稳定的请求做健康检查，避免启动时拉取大歌单。
  if (provider.type === 'nextmusic') {
    const body = await fetchJson(providerUrl(provider, 'getip'))
    if (body.code !== 200 || !body.data?.ip) throw new Error('认证接口异常')
    const token = md5('suxiaoqings:' + body.data.ip)
    tokenByProvider.set(provider.base, token)
    return { token }
  }

  if (provider.type === 'ncm') {
    const body = await fetchJson(providerUrl(provider, 'song/detail', { ids: HEALTH_SONG_ID }))
    if (!Array.isArray(body.songs) || !body.songs.length) throw new Error('歌曲详情异常')
    return {}
  }

  if (provider.type === 'meting') {
    const body = await fetchJson(metingUrl(provider, 'song', HEALTH_SONG_ID))
    if (!Array.isArray(body) || !body.length) throw new Error('单曲接口异常')
    return {}
  }

  throw new Error('未知接口类型')
}

async function requestByProvider(provider, path, data) {
  if (provider.type === 'nextmusic') return requestNextMusic(provider, path, data)
  if (provider.type === 'ncm') return requestNcm(provider, path, data)
  if (provider.type === 'meting') return requestMeting(provider, path, data)
  throw new Error('未知接口类型')
}

async function requestNextMusic(provider, path, data) {
  // nextmusic 需要先根据访问 IP 生成 token；token 按 base 缓存，避免重复认证。
  if (!tokenByProvider.has(provider.base)) await checkProvider(provider)

  const body = await fetchJson(providerUrl(provider, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, token: tokenByProvider.get(provider.base) }),
  })

  if (body.code !== 200) throw new Error(body.message || '请求失败')
  return body
}

async function requestNcm(provider, path, data) {
  // NeteaseCloudMusicApi 返回的是网易云原始结构，这里转成页面已有字段。
  if (path === 'getSongInfo') {
    const body = await fetchJson(providerUrl(provider, 'song/detail', { ids: data.id }))
    const song = body.songs?.[0]
    if (!song) throw new Error('解析失败')

    return {
      code: 200,
      data: {
        id: song.id,
        name: song.name,
        ar: song.ar,
        al: song.al,
        picimg: song.al?.picUrl,
        duration: formatDuration(song.dt),
      },
    }
  }

  if (path === 'getSongUrl') {
    const body = await fetchJson(providerUrl(provider, 'song/url/v1', {
      id: data.id,
      level: mapQuality(data.level),
    }))
    const item = body.data?.[0]
    if (!item?.url) throw new Error('无下载地址')

    return {
      code: 200,
      data: {
        id: item?.id || data.id,
        url: item?.url || '',
        type: item?.type,
      },
    }
  }

  if (path === 'getPlaylist') {
    const body = await fetchJson(providerUrl(provider, 'playlist/detail', { id: data.id }))
    const playlist = body.playlist
    if (!playlist) throw new Error('歌单解析失败')

    return {
      code: 200,
      data: {
        name: playlist.name,
        coverImage: playlist.coverImgUrl,
        creator: playlist.creator,
        description: playlist.description,
        playCount: playlist.playCount,
        songs: playlist.tracks || [],
      },
    }
  }

  throw new Error('不支持的接口: ' + path)
}

async function requestMeting(provider, path, data) {
  // Meting 的返回结构更轻量，歌单没有完整标题/作者等元数据，只作为可用兜底。
  if (path === 'getSongInfo') {
    const songs = await fetchJson(metingUrl(provider, 'song', data.id))
    const song = songs?.[0]
    if (!song) throw new Error('解析失败')

    return {
      code: 200,
      data: metingSongToTrack(song, data.id),
    }
  }

  if (path === 'getSongUrl') {
    const songs = await fetchJson(metingUrl(provider, 'song', data.id))
    const song = songs?.[0]
    if (!song?.url) throw new Error('无下载地址')

    return {
      code: 200,
      data: {
        id: data.id,
        url: song?.url || '',
      },
    }
  }

  if (path === 'getPlaylist') {
    const songs = await fetchJson(metingUrl(provider, 'playlist', data.id))
    if (!Array.isArray(songs)) throw new Error('歌单解析失败')

    return {
      code: 200,
      data: {
        name: '歌单 ' + data.id,
        coverImage: songs[0]?.pic || '',
        creator: { nickname: provider.name },
        description: '',
        songs: songs.map((song, index) => metingSongToTrack(song, metingSongId(song) || String(index + 1))),
      },
    }
  }

  throw new Error('不支持的接口: ' + path)
}

function sortedProviders() {
  // 手动选择的接口排在第一位；如果它失败，再按健康检查结果尝试其它可用接口。
  const knownAvailable = apiStatuses
    .filter(status => status.ok)
    .map(status => status.provider)

  const candidates = knownAvailable.length ? knownAvailable : API_PROVIDERS
  if (!activeProvider) return candidates

  return [
    activeProvider,
    ...candidates.filter(provider => provider.base !== activeProvider.base),
  ]
}

function markProviderFailed(provider, err) {
  const status = apiStatuses.find(item => item.provider.base === provider.base)
  if (status) {
    status.ok = false
    status.error = err.message || '请求失败'
  }
}

function isProviderLevelError(err) {
  return !['无下载地址', '解析失败', '歌单解析失败'].includes(err.message)
}

async function fetchJson(url, options = {}) {
  const res = await fetchWithTimeout(url, options)
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || '请求失败')
  return body
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function providerUrl(provider, path, params) {
  const url = new URL(trimSlash(provider.base) + '/' + path)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

function metingUrl(provider, type, id) {
  const url = new URL(provider.base)
  url.searchParams.set('server', 'netease')
  url.searchParams.set('type', type)
  url.searchParams.set('id', id)
  return url.toString()
}

function metingSongToTrack(song, fallbackId) {
  // Meting 的 song.url 通常是它自己的取址接口，从里面反推歌曲 ID。
  return {
    id: metingSongId(song) || fallbackId,
    name: song.name || '?',
    singer: Array.isArray(song.artist) ? song.artist.join('/') : song.artist,
    album: song.album || '',
    picimg: song.pic || '',
    url: song.url || '',
  }
}

function metingSongId(song) {
  try {
    return new URL(song.url).searchParams.get('id')
  } catch {
    return null
  }
}

function mapQuality(level) {
  return {
    standard: 'standard',
    higher: 'higher',
    exhigh: 'exhigh',
    lossless: 'lossless',
    hires: 'hires',
  }[level] || 'standard'
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '--:--'
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return minutes + ':' + seconds
}

function trimSlash(text) {
  return text.replace(/\/+$/, '')
}
