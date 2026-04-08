const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

export async function onRequest({ request }) {
  const audioUrl = new URL(request.url).searchParams.get('url');
  const filename = new URL(request.url).searchParams.get('name') || 'song.mp3';

  if (!audioUrl) {
    return new Response('Missing audio URL', { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(audioUrl, { headers: HEADERS });

    return new Response(upstreamResponse.body, {
      status: normalizeStatus(upstreamResponse.status, 200),
      headers: {
        'Content-Type': upstreamResponse.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Disposition': buildContentDisposition(filename),
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response('Error fetching stream: ' + err.message, { status: 500 });
  }
}

function buildContentDisposition(filename) {
  const encodedName = encodeURIComponent(filename);
  return `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`;
}

function normalizeStatus(status, fallback) {
  return Number.isInteger(status) && status >= 200 && status <= 599 ? status : fallback;
}
