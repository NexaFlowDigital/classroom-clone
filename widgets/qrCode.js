// widgets/qrCode.js

export default function createQRCodeWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'qrCode';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '180px',
    height: cfg.height || '180px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const data = cfg.data || prompt('Enter text or URL to encode:');
  if (data) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=150x150`;
    Object.assign(img.style, {
      flex: '1',
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    });
    cont.appendChild(img);
    w.dataset.data = data;
  } else {
    cont.textContent = '❌ No data provided.';
  }

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
