// widgets/video.js

export default function createVideoWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'video';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '300px',
    height: cfg.height || '200px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const url = cfg.url || prompt('Enter YouTube URL or video ID:');
  if (url) {
    let id = url;
    if (url.includes('v=')) {
      const match = url.match(/v=([^&]+)/);
      if (match) id = match[1];
    }

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}`;
    iframe.allowFullscreen = true;
    Object.assign(iframe.style, {
      flex: '1',
      width: '100%',
      height: '100%',
      border: 'none'
    });
    cont.appendChild(iframe);
    w.dataset.url = url;
  } else {
    cont.textContent = '❌ No video URL provided.';
  }

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
