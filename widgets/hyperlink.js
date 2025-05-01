// widgets/hyperlink.js

export default function createHyperlinkWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'hyperlink';

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

  const cont = document.createElement('div');
  cont.className = 'content';

  const toolbar = document.createElement('div');
  toolbar.className = 'widget-toolbar';
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Link';
  toolbar.appendChild(addBtn);
  cont.appendChild(toolbar);

  const list = document.createElement('div');
  Object.assign(list.style, {
    flex: '1',
    overflowY: 'auto',
    fontSize: '0.9rem'
  });
  cont.appendChild(list);

  let links = [];

  if (cfg.links) {
    try {
      links = JSON.parse(cfg.links);
    } catch {
      links = [];
    }
  }

  function render() {
    list.innerHTML = '';
    links.forEach((lnk, idx) => {
      const row = document.createElement('div');
      row.innerHTML = `
        <a href="${lnk.url}" target="_blank">${lnk.text}</a>
        <button data-del="${idx}">✖</button>
      `;
      row.querySelector('button').onclick = () => {
        links.splice(idx, 1);
        render();
        w.dataset.links = JSON.stringify(links);
      };
      list.appendChild(row);
    });
  }

  addBtn.onclick = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const text = prompt('Enter display text:', url) || url;
      links.push({ url, text });
      render();
      w.dataset.links = JSON.stringify(links);
    }
  };

  render();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
