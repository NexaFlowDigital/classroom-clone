// widgets/embed.js

export default function createEmbedWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'embed';

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

  const toolbar = document.createElement('div');
  toolbar.className = 'widget-toolbar';
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit URL';
  toolbar.appendChild(editBtn);
  cont.appendChild(toolbar);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    flex: '1',
    border: 'none',
    width: '100%',
    height: '100%'
  });
  cont.appendChild(iframe);

  function setURL(url) {
    if (url.includes('docs.google.com/presentation')) {
      url = url.replace('/edit', '/embed').split('&')[0];
    }
    iframe.src = url;
    w.dataset.url = url;
  }

  editBtn.onclick = () => {
    const newUrl = prompt('Enter embed URL:', w.dataset.url || '');
    if (newUrl) setURL(newUrl);
  };

  if (cfg.url) {
    setURL(cfg.url);
  } else {
    editBtn.click();
  }

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
