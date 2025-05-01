// widgets/stopwatch.js

import { formatTime } from '../utils/time.js';

export default function createStopwatchWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'stopwatch';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '220px',
    height: cfg.height || '180px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.elapsed = cfg.elapsed || '0';

  const cont = document.createElement('div');
  cont.className = 'content';

  const display = document.createElement('div');
  Object.assign(display.style, {
    flex: '0 0 auto',
    fontSize: '2rem',
    textAlign: 'center',
    margin: '8px 0'
  });
  cont.appendChild(display);

  const toolbar = document.createElement('div');
  toolbar.className = 'widget-toolbar';
  toolbar.innerHTML = `
    <button id="start">▶️</button>
    <button id="stop">⏸️</button>
    <button id="lap">🏁</button>
  `;
  cont.appendChild(toolbar);

  const laps = document.createElement('div');
  Object.assign(laps.style, {
    flex: '1',
    overflow: 'auto',
    fontSize: '0.85rem'
  });
  cont.appendChild(laps);

  let running = false;
  let start = 0;
  let elapsed = parseInt(w.dataset.elapsed, 10) || 0;
  let interval = null;

  function updateDisplay() {
    const now = running ? Date.now() - start + elapsed : elapsed;
    display.textContent = formatTime(Math.floor(now / 1000));
  }

  toolbar.querySelector('#start').onclick = () => {
    if (!running) {
      running = true;
      start = Date.now();
      interval = setInterval(updateDisplay, 500);
    }
  };

  toolbar.querySelector('#stop').onclick = () => {
    if (running) {
      running = false;
      clearInterval(interval);
      elapsed += Date.now() - start;
      w.dataset.elapsed = elapsed.toString();
      updateDisplay();
    }
  };

  toolbar.querySelector('#lap').onclick = () => {
    const lap = document.createElement('div');
    lap.textContent = display.textContent;
    laps.appendChild(lap);
  };

  updateDisplay();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
