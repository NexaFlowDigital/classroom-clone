// widgets/groupMaker.js

export default function createGroupMakerWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'groupMaker';

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

  const button = document.createElement('button');
  button.textContent = 'Make groups';
  cont.appendChild(button);

  const display = document.createElement('div');
  display.style.flex = '1';
  display.style.overflow = 'auto';
  display.style.marginTop = '8px';
  cont.appendChild(display);

  const names = cfg.names
    ? cfg.names.split(',')
    : prompt('Enter names, comma-separated:', 'Alice,Bob,Charlie,David,Eva').split(',');

  const groupSize = cfg.size
    ? parseInt(cfg.size, 10)
    : parseInt(prompt('Group size:'), 10) || 2;

  w.dataset.names = names.join(',');
  w.dataset.size = groupSize;

  button.onclick = () => {
    const shuffled = [...names].sort(() => 0.5 - Math.random());
    const groups = [];
    while (shuffled.length) {
      groups.push(shuffled.splice(0, groupSize));
    }
    display.innerHTML = groups.map(g => g.join(', ')).join('<br>');
  };

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
