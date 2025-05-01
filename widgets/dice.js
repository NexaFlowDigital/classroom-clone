// widgets/dice.js

export default function createDiceWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'dice';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '150px',
    height: cfg.height || '120px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.sides = cfg.sides || '6';

  const cont = document.createElement('div');
  cont.className = 'content';

  const rollBtn = document.createElement('button');
  rollBtn.textContent = 'Roll 🎲';
  cont.appendChild(rollBtn);

  const display = document.createElement('div');
  display.style.flex = '1';
  display.style.fontSize = '2rem';
  display.style.textAlign = 'center';
  cont.appendChild(display);

  rollBtn.onclick = () => {
    const sides = parseInt(w.dataset.sides, 10) || 6;
    const roll = Math.floor(Math.random() * sides) + 1;
    display.textContent = roll;
  };

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
