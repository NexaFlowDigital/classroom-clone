// widgets/draw.js

export default function createDrawWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'draw';

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

  const bar = document.createElement('div');
  bar.className = 'widget-toolbar';
  bar.innerHTML = `
    <button id="pen">✏️</button>
    <button id="eraser">🧹</button>
    <input type="color" id="color" value="${cfg.color || '#000'}">
    <input type="range" id="size" min="1" max="20" value="${cfg.size || 4}">
  `;
  cont.appendChild(bar);

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 150;
  cont.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';

  let drawing = false;
  let mode = 'pen';

  function setMode(m) {
    mode = m;
    ctx.globalCompositeOperation = m === 'erase' ? 'destination-out' : 'source-over';
  }

  setMode('pen');
  ctx.strokeStyle = cfg.color || '#000';
  ctx.lineWidth = cfg.size || 4;

  canvas.addEventListener('mousedown', e => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  document.addEventListener('mouseup', () => {
    drawing = false;
  });

  bar.querySelector('#pen').onclick = () => setMode('pen');
  bar.querySelector('#eraser').onclick = () => setMode('erase');
  bar.querySelector('#color').oninput = e => {
    ctx.strokeStyle = e.target.value;
    w.dataset.color = e.target.value;
  };
  bar.querySelector('#size').oninput = e => {
    ctx.lineWidth = e.target.value;
    w.dataset.size = e.target.value;
  };

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
