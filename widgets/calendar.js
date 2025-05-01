// widgets/calendar.js

export default function createCalendarWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'calendar';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '300px',
    height: cfg.height || '250px',
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
    <button id="prev">‹</button>
    <span id="title"></span>
    <button id="next">›</button>
  `;
  cont.appendChild(bar);

  const grid = document.createElement('div');
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    flex: '1',
    fontSize: '0.85rem',
    textAlign: 'center'
  });
  cont.appendChild(grid);

  let date = cfg.date ? new Date(cfg.date) : new Date();
  w.dataset.date = date.toISOString();

  function render() {
    grid.innerHTML = '';
    const title = bar.querySelector('#title');
    title.innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    days.forEach(d => {
      const cell = document.createElement('div');
      cell.style.fontWeight = 'bold';
      cell.innerText = d;
      grid.appendChild(cell);
    });

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= lastDate; d++) {
      const cell = document.createElement('div');
      cell.innerText = d;
      cell.style.cursor = 'pointer';
      cell.onclick = () => {
        w.dataset.selected = d;
      };
      grid.appendChild(cell);
    }
  }

  bar.querySelector('#prev').onclick = () => {
    date.setMonth(date.getMonth() - 1);
    w.dataset.date = date.toISOString();
    render();
  };

  bar.querySelector('#next').onclick = () => {
    date.setMonth(date.getMonth() + 1);
    w.dataset.date = date.toISOString();
    render();
  };

  render();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
