export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const audioUrl = url.searchParams.get('url');
  let filename = url.searchParams.get('name') || 'song.mp3';

  if (!audioUrl) {
    return new Response('Missing audio URL', { status: 400 });
  }

  try {
    const audioRes = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const encodedName = encodeURIComponent(filename);
    
    return new Response(audioRes.body, {
      status: audioRes.status,
      headers: {
        'Content-Type': audioRes.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response('Error fetching stream: ' + err.message, { status: 500 });
  }
}
