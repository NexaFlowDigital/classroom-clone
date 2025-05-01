// widgets/workSymbols.js

export default function createWorkSymbolsWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'workSymbols';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '160px',
    height: cfg.height || '140px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const symbols = ['✏️', '☕️', '✅', '🔴'];
  let index = parseInt(w.dataset.idx || cfg.idx || 0, 10);

  const symbolDisplay = document.createElement('div');
  Object.assign(symbolDisplay.style, {
    flex: '1',
    fontSize: '2rem',
    textAlign: 'center',
    marginBottom: '8px'
  });
  cont.appendChild(symbolDisplay);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next';
  nextBtn.onclick = () => {
    index = (index + 1) % symbols.length;
    w.dataset.idx = index;
    symbolDisplay.textContent = symbols[index];
  };
  cont.appendChild(nextBtn);

  symbolDisplay.textContent = symbols[index];

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
