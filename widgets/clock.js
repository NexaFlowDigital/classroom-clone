// widgets/clock.js

export default function createClockWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'clock';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '200px',
    height: cfg.height || '100px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.format24 = cfg.format24 || 'false';
  w.dataset.color = cfg.color || '#000';

  const cont = document.createElement('div');
  cont.className = 'content';

  const disp = document.createElement('div');
  Object.assign(disp.style, {
    flex: '1',
    fontSize: '24px',
    textAlign: 'center',
    color: w.dataset.color
  });
  cont.appendChild(disp);

  function updateClock() {
    const now = new Date();
    const opts = w.dataset.format24 === 'true'
      ? { hour12: false }
      : { hour12: true };
    disp.innerText = now.toLocaleTimeString([], opts);
  }

  setInterval(updateClock, 1000);
  updateClock();

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
