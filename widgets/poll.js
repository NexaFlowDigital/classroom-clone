// widgets/poll.js

export default function createPollWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'poll';

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

  const question = cfg.q || prompt('Enter poll question:') || '...?';
  const options = cfg.opts
    ? cfg.opts.split(',')
    : prompt('Enter comma-separated options:', 'Yes,No').split(',');

  let counts = cfg.counts
    ? cfg.counts.split(',').map(Number)
    : new Array(options.length).fill(0);

  w.dataset.q = question;
  w.dataset.opts = options.join(',');
  w.dataset.counts = counts.join(',');

  function render() {
    cont.innerHTML = `<strong>${question}</strong><br>`;
    options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.innerText = `${opt.trim()} (${counts[i]})`;
      btn.onclick = () => {
        counts[i]++;
        w.dataset.counts = counts.join(',');
        render();
      };
      cont.appendChild(btn);
      cont.appendChild(document.createElement('br'));
    });
  }

  render();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
