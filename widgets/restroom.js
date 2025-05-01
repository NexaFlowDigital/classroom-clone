// widgets/restroom.js

export default function createRestroomWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'restroom';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '200px',
    height: cfg.height || '160px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });

  const cont = document.createElement('div');
  cont.className = 'content';

  const list = document.createElement('ul');
  Object.assign(list.style, {
    listStyle: 'none',
    padding: '0',
    margin: '0',
    flex: '1',
    overflowY: 'auto'
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter name...';
  input.style.marginRight = '6px';

  const btn = document.createElement('button');
  btn.textContent = '📝 Sign Out';

  const bar = document.createElement('div');
  bar.className = 'widget-toolbar';
  bar.append(input, btn);
  cont.append(bar, list);

  btn.onclick = () => {
    const name = input.value.trim();
    if (!name) return;
    const li = document.createElement('li');
    li.textContent = `${name} ⏳`;
    li.style.margin = '4px 0';
    list.appendChild(li);
    input.value = '';
  };

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
