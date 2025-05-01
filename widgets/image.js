// widgets/image.js

export default function createImageWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'image';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '250px',
    height: cfg.height || '200px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const url = cfg.url || prompt('Enter image URL:');
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    Object.assign(img.style, {
      flex: '1',
      objectFit: 'contain',
      width: '100%',
      height: '100%'
    });
    cont.appendChild(img);
    w.dataset.url = url;
  } else {
    cont.textContent = '❌ No image URL provided.';
  }

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
