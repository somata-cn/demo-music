const $ = (id) => document.getElementById(id);
const dom = ['mode', 'quality', 'target', 'submit', 'message', 'loading', 'singleCard', 'singleCover', 'singleTitle', 'singleMeta', 'singleExtra', 'singleAudio', 'singleDownload', 'playlistCard', 'playlistCover', 'playlistTitle', 'playlistMeta', 'playlistExtra', 'playlistDownload', 'delay', 'progress', 'tracks'].reduce((map, id) => ((map[id] = $(id)), map), {});
const state = { song: null, tracks: [], busy: false };
const cover = 'https://via.placeholder.com/240?text=Music';

dom.mode.onchange = reset;
dom.submit.onclick = parse;
dom.target.onkeydown = (event) => {
  if (event.key === 'Enter') parse();
};
dom.singleDownload.onclick = () => state.song && download(state.song.url, state.song.name, state.song.artist);
dom.playlistDownload.onclick = downloadAll;
dom.tracks.onclick = async (event) => {
  const button = event.target.closest('button[data-index]');
  if (!button) return;
  const song = state.tracks[button.dataset.index];
  if (!song) return;
  try {
    await downloadOne(song, button);
  } catch (error) {
    show(`下载失败：${song.name}，${error.message}`, 'error');
  }
};
reset();

function reset() {
  state.song = null;
  state.tracks = [];
  dom.singleCard.hidden = true;
  dom.playlistCard.hidden = true;
  dom.message.textContent = '';
  dom.message.dataset.tone = '';
  dom.target.placeholder = dom.mode.value === 'single' ? '粘贴单曲链接或数字 ID' : '粘贴歌单链接或数字 ID';
}

async function parse() {
  const id = (dom.target.value.trim().match(/^\d+$/) || dom.target.value.match(/[?&]id=(\d+)/))?.[0]?.replace(/^.*=/, '');
  dom.singleCard.hidden = true;
  dom.playlistCard.hidden = true;
  show('');
  if (!id) return show('无法识别有效 ID。', 'error');

  dom.submit.disabled = true;
  dom.loading.hidden = false;
  try {
    dom.mode.value === 'single' ? await parseSong(id) : await parseList(id);
  } catch (error) {
    show(error.message || '请求失败。', 'error');
  }
  dom.submit.disabled = false;
  dom.loading.hidden = true;
}

async function parseSong(id) {
  const [info, link] = await Promise.all([api('/api/getSongInfo', { id }), api('/api/getSongUrl', { id, level: dom.quality.value })]);
  if (!info.data || !link.data?.url) throw new Error(info.message || link.message || '单曲解析失败');
  const song = info.data;
  const artist = artistOf(song);
  state.song = { name: song.name || '未知歌曲', artist, url: link.data.url };
  dom.singleCover.src = song.picimg || cover;
  dom.singleTitle.textContent = state.song.name;
  dom.singleMeta.textContent = `${artist} · ${albumOf(song)}`;
  dom.singleExtra.textContent = `${song.duration || '00:00'} · ${dom.quality.selectedOptions[0].textContent}`;
  dom.singleAudio.src = state.song.url;
  dom.singleCard.hidden = false;
  show('单曲解析成功。', 'success');
}

async function parseList(id) {
  const result = await api('/api/getPlaylist', { id });
  const list = result.data;
  if (!list) throw new Error(result.message || '歌单解析失败');
  state.tracks = list.songs || list.tracks || [];
  dom.progress.textContent = '等待';
  dom.playlistCover.src = list.coverImage || list.picUrl || cover;
  dom.playlistTitle.textContent = list.name || '未知歌单';
  dom.playlistMeta.textContent = `${list.creator?.nickname || list.creator?.name || '未知用户'} · ${state.tracks.length} 首`;
  dom.playlistExtra.textContent = list.description || `${Number(list.playCount || 0).toLocaleString('zh-CN')} 次播放`;
  dom.tracks.innerHTML = state.tracks.length
    ? state.tracks.map((song, index) => `<article class="track"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escape(song.name || '未知歌曲')}</strong><p>${escape(artistOf(song))} · ${escape(albumOf(song))}</p></div><button data-index="${index}">下载</button></article>`).join('')
    : '<p class="empty">当前歌单没有可下载歌曲。</p>';
  dom.playlistCard.hidden = false;
  show('歌单解析成功。', 'success');
}

async function downloadOne(song, button) {
  const text = button.textContent;
  button.disabled = true;
  button.textContent = '解析中';
  try {
    const result = await api('/api/getSongUrl', { id: song.id, level: dom.quality.value });
    if (!result.data?.url) throw new Error(result.message || '未获取到下载地址');
    download(result.data.url, song.name, artistOf(song));
    button.textContent = '已开始';
    await wait(800);
  } finally {
    button.disabled = false;
    button.textContent = text;
  }
}

async function downloadAll() {
  if (state.busy || !state.tracks.length) return;
  state.busy = true;
  dom.playlistDownload.disabled = true;
  dom.delay.disabled = true;
  const delay = Number(dom.delay.value) || 180000;
  try {
    for (const [index, song] of state.tracks.entries()) {
      dom.progress.textContent = `${index + 1}/${state.tracks.length}`;
      try {
        await downloadOne(song, dom.tracks.querySelector(`[data-index="${index}"]`));
      } catch {
      }
      if (delay && index < state.tracks.length - 1) await wait(delay);
    }
    show('歌单下载已完成。', 'success');
  } finally {
    state.busy = false;
    dom.playlistDownload.disabled = false;
    dom.delay.disabled = false;
    dom.progress.textContent = '等待';
  }
}

async function api(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message || `请求失败 (${response.status})`);
  return data;
}

function download(url, name, artist) {
  const ext = url.includes('.flac') ? '.flac' : url.includes('.m4a') ? '.m4a' : '.mp3';
  const a = document.createElement('a');
  a.href = `/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(`${artist} - ${name}${ext}`)}`;
  a.download = `${artist} - ${name}${ext}`;
  document.body.append(a);
  a.click();
  a.remove();
}

function artistOf(song) {
  return song.singer || song.ar?.map((item) => item.name).join('/') || '未知歌手';
}

function albumOf(song) {
  return song.album || song.al?.name || '未知专辑';
}

function show(text, tone = '') {
  dom.message.textContent = text;
  dom.message.dataset.tone = tone;
}

function escape(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
