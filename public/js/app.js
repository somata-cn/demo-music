// DOM 引用 ----------------------------------------------------------------

const el = {
  mode:    $('mode'),
  quality: $('quality'),
  target:  $('target'),
  submit:  $('submit'),
  message: $('message'),
  apiStatus: $('apiStatus'),
  apiPanel: $('apiPanel'),
  apiProvider: $('apiProvider'),
  apiRefresh: $('apiRefresh'),
  loading: $('loading'),

  single:   $('singleCard'),
  cover:    $('singleCover'),
  title:    $('singleTitle'),
  artist:   $('singleMeta'),
  extra:    $('singleExtra'),
  player:   $('singleAudio'),
  download: $('singleDownload'),

  playlist: $('playlistCard'),
  plcover:  $('playlistCover'),
  pltitle:  $('playlistTitle'),
  plmeta:   $('playlistMeta'),
  plextra:  $('playlistExtra'),
  tracks:   $('tracks'),
  delay:    $('delay'),
  batchDl:  $('batchDl'),
  progress: $('progress'),
}

let state = { song: null, tracks: [] }

// 初始化认证 -------------------------------------------------------------

el.submit.disabled = true
setApiStatus('接口检查中...')

authenticate().then(status => {
  el.submit.disabled = false
  renderApiProviders(status)
}).catch(err => {
  el.submit.disabled = true
  setMessage('认证失败: ' + err.message, 'err')
  setApiStatus('接口不可用', 'err')
  renderApiProviders(getApiStatus())
})

// 事件绑定 ----------------------------------------------------------------

el.submit.onclick = handleParse
el.target.onkeydown = e => { if (e.key === 'Enter') handleParse() }

el.mode.onchange = () => {
  el.single.hidden = true
  el.playlist.hidden = true
  el.message.textContent = ''
}

el.download.onclick = async () => {
  if (state.song?.url) {
    el.download.disabled = true
    try {
      await triggerDownload(state.song.url, state.song.name, state.song.artist)
      setMessage('已开始下载', 'ok')
    } catch (err) {
      setMessage('下载失败: ' + err.message, 'err')
    } finally {
      el.download.disabled = false
    }
  }
}

el.batchDl.onclick = batchDownload

el.apiProvider.onchange = () => {
  try {
    const status = selectApiProvider(el.apiProvider.value)
    renderApiProviders(status)
  } catch (err) {
    setApiStatus(err.message, 'err')
  }
}

el.apiRefresh.onclick = async () => {
  el.submit.disabled = true
  el.apiRefresh.disabled = true
  setApiStatus('接口检查中...')

  try {
    const status = await authenticate()
    renderApiProviders(status)
    el.submit.disabled = false
  } catch (err) {
    setMessage('认证失败: ' + err.message, 'err')
    setApiStatus('接口不可用', 'err')
    renderApiProviders(getApiStatus())
  } finally {
    el.apiRefresh.disabled = false
  }
}

// 曲目列表中单个下载按钮
el.tracks.onclick = async e => {
  const btn = e.target.closest('button[data-idx]')
  if (!btn) return
  const song = state.tracks[+btn.dataset.idx]
  btn.disabled = true
  btn.textContent = '解析中'
  try {
    const res = await api('getSongUrl', { id: song.id, level: el.quality.value })
    if (!res.data?.url) throw new Error('无下载地址')
    await triggerDownload(res.data.url, song.name, artistOf(song))
    btn.textContent = '已开始'
    await new Promise(r => setTimeout(r, 800))
  } catch (err) {
    setMessage('下载失败: ' + err.message, 'err')
  }
  btn.textContent = '下载'
  btn.disabled = false
}

// 主流程 ------------------------------------------------------------------

async function handleParse() {
  const id = extractId(el.target.value)
  el.single.hidden = true
  el.playlist.hidden = true
  setMessage('')
  if (!id) return setMessage('无法识别 ID', 'err')

  el.submit.disabled = true
  el.loading.hidden = false
  try {
    if (el.mode.value === 'single') {
      await parseSong(id)
    } else {
      await parsePlaylist(id)
    }
  } catch (err) {
    setMessage(err.message, 'err')
  }
  el.submit.disabled = false
  el.loading.hidden = true
}

async function parseSong(id) {
  const [info, link] = await Promise.all([
    api('getSongInfo', { id }),
    api('getSongUrl', { id, level: el.quality.value }),
  ])
  if (!info.data) throw new Error('解析失败')

  const name = info.data.name || '?'
  const artist = artistOf(info.data)
  const url = link.data?.url

  state.song = { name, artist, url }

  el.cover.src = info.data.picimg || ''
  el.title.textContent = name
  el.artist.textContent = artist
  el.extra.textContent = (info.data.duration || '--:--') + ' · ' + el.quality.selectedOptions[0].textContent
  el.player.src = url || ''
  el.download.disabled = !url
  el.single.hidden = false

  setMessage(url ? 'OK' : '暂无下载地址', url ? 'ok' : 'err')
}

async function parsePlaylist(id) {
  const res = await api('getPlaylist', { id })
  const data = res.data
  if (!data) throw new Error('歌单解析失败')

  state.tracks = data.songs || data.tracks || []

  el.plcover.src = data.coverImage || data.picUrl || ''
  el.pltitle.textContent = data.name || '?'
  el.plmeta.textContent = (data.creator?.nickname || data.creator?.name || '?') + ' · ' + state.tracks.length + ' 首'
  el.plextra.textContent = data.description || (data.playCount ? Number(data.playCount).toLocaleString() + ' 次播放' : '')

  el.tracks.innerHTML = state.tracks.length
    ? state.tracks.map((s, i) => `
      <div class="track">
        <span>${String(i + 1).padStart(2, '0')}</span>
        <div>
          <strong>${escapeHtml(s.name || '?')}</strong>
          <p>${escapeHtml(artistOf(s))} · ${escapeHtml(albumOf(s))}</p>
        </div>
        <button data-idx="${i}">下载</button>
      </div>`).join('')
    : '<div class="track" style="grid-template-columns:1fr;justify-items:center">歌单为空</div>'

  el.playlist.hidden = false
  setMessage('OK', 'ok')
}

async function batchDownload() {
  if (state.busy || !state.tracks.length) return
  state.busy = true
  el.batchDl.disabled = true
  el.delay.disabled = true

  const interval = Number(el.delay.value) || 180000

  try {
    for (const [i, song] of state.tracks.entries()) {
      el.progress.textContent = (i + 1) + '/' + state.tracks.length
      try {
        const btn = el.tracks.querySelector(`[data-idx="${i}"]`)
        if (btn) { btn.disabled = true; btn.textContent = '解析中' }

        const res = await api('getSongUrl', { id: song.id, level: el.quality.value })
        if (res.data?.url) {
          await triggerDownload(res.data.url, song.name, artistOf(song))
          if (btn) btn.textContent = '已开始'
        }
        if (btn) { btn.textContent = '下载'; btn.disabled = false }
      } catch { /* skip */ }
      if (interval && i < state.tracks.length - 1) {
        await new Promise(r => setTimeout(r, interval))
      }
    }
    setMessage('下载完成', 'ok')
  } finally {
    state.busy = false
    el.batchDl.disabled = false
    el.delay.disabled = false
    el.progress.textContent = '等待'
  }
}

// 下载触发 ----------------------------------------------------------------

async function triggerDownload(url, name, artist) {
  if (!url) throw new Error('无下载地址')

  const ext = getAudioExt(url)
  const filename = safeFilename((artist || '?') + ' - ' + (name || '?') + ext)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('音频请求失败')

    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    clickDownload(objectUrl, filename)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000)
  } catch (err) {
    clickDownload(url, filename)
  }
}

function clickDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}

function getAudioExt(url) {
  try {
    const pathname = new URL(url).pathname
    return pathname.match(/\.(flac|m4a|mp3|wav|aac|ogg)$/i)?.[0] || '.mp3'
  } catch {
    return url.match(/\.(flac|m4a|mp3|wav|aac|ogg)(?=$|[?#])/i)?.[0] || '.mp3'
  }
}

function safeFilename(filename) {
  return filename.replace(/[\\/:*?"<>|]+/g, '_')
}

function renderApiProviders(status) {
  if (!status?.list?.length) return

  el.apiPanel.hidden = false
  el.apiProvider.innerHTML = status.list.map(item => {
    const label = item.ok ? '可用' : '不可用'
    const reason = item.ok ? '' : ' - ' + escapeHtml(item.error || '检查失败')
    const selected = status.active?.base === item.provider.base ? ' selected' : ''
    const disabled = item.ok ? '' : ' disabled'

    return `<option value="${escapeHtml(item.provider.base)}"${selected}${disabled}>${escapeHtml(item.provider.name)} · ${label}${reason}</option>`
  }).join('')

  if (status.active) {
    setApiStatus('当前接口: ' + status.active.name + ' (' + status.available + '/' + status.total + ' 可用)', 'ok')
  } else {
    setApiStatus('接口不可用', 'err')
  }
}
