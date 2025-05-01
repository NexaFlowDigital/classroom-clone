// widgets/eventCountdown.js

export default function createEventCountdownWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'eventCountdown';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '220px',
    height: cfg.height || '160px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });

  const cont = document.createElement('div');
  cont.className = 'content';

  w.dataset.title = cfg.title || 'Event';
  w.dataset.date = cfg.date || new Date().toISOString().substr(0, 10);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Event Title';
  titleInput.value = w.dataset.title;

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = w.dataset.date;

  const display = document.createElement('div');
  Object.assign(display.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.1rem',
    marginTop: '8px'
  });

  function update() {
    w.dataset.title = titleInput.value;
    w.dataset.date = dateInput.value;

    const now = new Date();
    const target = new Date(w.dataset.date);
    const diff = Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));

    display.innerHTML = `<strong>${w.dataset.title}</strong><br>${diff} day${diff === 1 ? '' : 's'} left`;
  }

  titleInput.oninput = update;
  dateInput.onchange = update;

  update();
  cont.append(titleInput, dateInput, display);

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
