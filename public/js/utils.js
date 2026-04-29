// DOM shortcut
const $ = id => document.getElementById(id)

// 消息提示
function setMessage(text, type) {
  el.message.textContent = text
  el.message.className = type || ''
}

function setApiStatus(text, type) {
  if (!el.apiStatus) return
  el.apiStatus.textContent = text
  el.apiStatus.className = 'api-status ' + (type || '')
}

// HTML 转义
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(str).replace(/[&<>"']/g, c => map[c])
}

// 歌手名
function artistOf(song) {
  return song.singer || song.ar?.map(a => a.name).join('/') || '?'
}

// 专辑名
function albumOf(song) {
  return song.album || song.al?.name || '?'
}

// 从用户输入提取 ID
function extractId(text) {
  text = text.trim()
  if (/^\d+$/.test(text)) return text
  return text.match(/[?&]id=(\d+)/)?.[1]
      || text.match(/(\d{5,})/)?.[1]
      || null
}
