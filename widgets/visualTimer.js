// widgets/visualTimer.js

import { formatTime } from '../utils/time.js';

export default function createVisualTimerWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'visualTimer';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '160px',
    height: cfg.height || '180px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.total = cfg.total || 60;

  const cont = document.createElement('div');
  cont.className = 'content';

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 120;
  cont.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let total = parseInt(w.dataset.total, 10);
  let remaining = total;
  let id;

  function drawTimer() {
    ctx.clearRect(0, 0, 120, 120);
    const pct = remaining / total;

    ctx.beginPath();
    ctx.arc(60, 60, 54, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * pct);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#007BFF';
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(formatTime(remaining), 60, 60);

    w.dataset.remaining = remaining;
  }

  function resetTimer() {
    clearInterval(id);
    total = parseInt(w.dataset.total, 10);
    remaining = total;
    drawTimer();
  }

  resetTimer();
  id = setInterval(() => {
    if (remaining > 0) {
      remaining--;
      drawTimer();
    } else {
      clearInterval(id);
    }
  }, 1000);

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
