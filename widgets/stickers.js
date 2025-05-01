// widgets/stickers.js

export default function createStickersWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'stickers';

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

  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Sticker';
  cont.appendChild(addBtn);

  const gallery = document.createElement('div');
  Object.assign(gallery.style, {
    flex: '1',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    overflowY: 'auto',
    gap: '6px',
    padding: '4px'
  });
  cont.appendChild(gallery);

  function makeDraggable(el) {
    el.onmousedown = e => {
      e.preventDefault();
      let shiftX = e.clientX - el.getBoundingClientRect().left;
      let shiftY = e.clientY - el.getBoundingClientRect().top;

      function moveAt(pageX, pageY) {
        el.style.position = 'absolute';
        el.style.left = pageX - shiftX + 'px';
        el.style.top = pageY - shiftY + 'px';
      }

      function onMouseMove(e) {
        moveAt(e.pageX, e.pageY);
      }

      document.addEventListener('mousemove', onMouseMove);
      el.onmouseup = () => {
        document.removeEventListener('mousemove', onMouseMove);
        el.onmouseup = null;
      };
    };
    el.ondragstart = () => false;
  }

  addBtn.onclick = () => {
    const url = prompt('Enter sticker image URL:');
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      Object.assign(img.style, {
        width: '50px',
        height: '50px',
        cursor: 'move'
      });
      gallery.appendChild(img);
      makeDraggable(img);
    }
  };

  if (cfg.html) {
    gallery.innerHTML = cfg.html;
    [...gallery.querySelectorAll('img')].forEach(makeDraggable);
  }

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
