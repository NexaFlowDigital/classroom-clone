// widgets/timetable.js

export default function createTimetableWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'timetable';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '250px',
    height: cfg.height || '200px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });

  const cont = document.createElement('div');
  cont.className = 'content';

  const bar = document.createElement('div');
  bar.className = 'widget-toolbar';
  bar.innerHTML = `<button id="addActivity">+ Activity</button>`;
  cont.appendChild(bar);

  const list = document.createElement('div');
  Object.assign(list.style, {
    flex: '1',
    overflow: 'auto',
    padding: '4px',
    fontSize: '0.9rem'
  });
  cont.appendChild(list);

  if (cfg.html) {
    list.innerHTML = cfg.html;
  } else {
    list.innerHTML = `<div>08:00 – <span contenteditable>Welcome Activity</span></div>`;
  }

  bar.querySelector('#addActivity').onclick = () => {
    const time = prompt('Enter time (e.g. 10:00):');
    const task = prompt('Enter activity:');
    if (time && task) {
      const item = document.createElement('div');
      item.innerHTML = `${time} – <span contenteditable>${task}</span>`;
      list.appendChild(item);
    }
  };

  w.dataset.html = list.innerHTML;
  list.oninput = () => {
    w.dataset.html = list.innerHTML;
  };

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
