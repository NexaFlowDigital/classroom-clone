// widgets/text.js

export default function createTextWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'text';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '200px',
    height: cfg.height || '150px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const div = document.createElement('div');
  div.contentEditable = true;
  div.style.flex = '1';
  div.style.padding = '4px';
  div.style.overflow = 'auto';
  div.style.fontSize = cfg.txtSize || '14px';
  div.style.color = cfg.txtColor || '#000';
  div.style.background = cfg.bgColor || '#fff';
  div.innerHTML = cfg.html || 'Click to edit…';

  div.oninput = () => {
    w.dataset.html = div.innerHTML;
  };

  cont.appendChild(div);
  w.appendChild(cont);

  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
