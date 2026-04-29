// DOM 引用 ----------------------------------------------------------------

const el = {
  mode:    $('mode'),
  quality: $('quality'),
  target:  $('target'),
  submit:  $('submit'),
  message: $('message'),
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

authenticate().catch(err => {
  el.submit.disabled = true
  setMessage('认证失败: ' + err.message, 'err')
})

// 事件绑定 ----------------------------------------------------------------

el.submit.onclick = handleParse
el.target.onkeydown = e => { if (e.key === 'Enter') handleParse() }

el.mode.onchange = () => {
  el.single.hidden = true
  el.playlist.hidden = true
  el.message.textContent = ''
}

el.download.onclick = () => {
  if (state.song) {
    triggerDownload(state.song.url, state.song.name, state.song.artist)
  }
}

el.batchDl.onclick = batchDownload

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
    triggerDownload(res.data.url, song.name, artistOf(song))
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
          triggerDownload(res.data.url, song.name, artistOf(song))
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

function triggerDownload(url, name, artist) {
  const ext = url.match(/\.(flac|m4a)/)?.[0] || '.mp3'
  const filename = (artist || '?') + ' - ' + (name || '?') + ext
  const a = document.createElement('a')
  a.href = '/download?url=' + encodeURIComponent(url) + '&name=' + encodeURIComponent(filename)
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
}
