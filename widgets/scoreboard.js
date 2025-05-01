// widgets/scoreboard.js

export default function createScoreboardWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'scoreboard';

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
  w.dataset.count = cfg.count || '2';

  const cont = document.createElement('div');
  cont.className = 'content';

  const teamBox = document.createElement('div');
  teamBox.style.flex = '1';
  teamBox.style.overflow = 'auto';
  cont.appendChild(teamBox);

  function renderTeams() {
    teamBox.innerHTML = '';
    const count = parseInt(w.dataset.count, 10) || 2;
    for (let i = 1; i <= count; i++) {
      let score = 0;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.margin = '4px';

      const label = document.createElement('span');
      label.textContent = `Team ${i}: `;

      const display = document.createElement('span');
      display.textContent = score;
      display.style.margin = '0 8px';

      const plus = document.createElement('button');
      plus.textContent = '+';
      plus.onclick = () => {
        score++;
        display.textContent = score;
      };

      const minus = document.createElement('button');
      minus.textContent = '-';
      minus.onclick = () => {
        score--;
        display.textContent = score;
      };

      row.append(label, minus, display, plus);
      teamBox.appendChild(row);
    }
  }

  renderTeams();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
