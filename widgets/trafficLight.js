// widgets/trafficLight.js

export default function createTrafficLightWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'trafficLight';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '120px',
    height: cfg.height || '180px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.desc = cfg.desc || '';
  w.dataset.state = cfg.state || 'red';

  const cont = document.createElement('div');
  cont.className = 'content';

  const box = document.createElement('div');
  box.style.background = '#222';
  box.style.padding = '8px';
  box.style.borderRadius = '4px';
  box.style.textAlign = 'center';
  box.style.flex = '1';

  const states = ['red', 'yellow', 'green'];
  let current = states.indexOf(w.dataset.state);
  if (current < 0) current = 0;

  function render() {
    box.innerHTML = '';
    states.forEach((color, i) => {
      const light = document.createElement('div');
      light.style.width = '30px';
      light.style.height = '30px';
      light.style.margin = '6px auto';
      light.style.borderRadius = '50%';
      light.style.background = i === current ? color : '#444';
      light.style.border = '2px solid #111';
      box.appendChild(light);
    });

    if (w.dataset.desc) {
      const label = document.createElement('div');
      label.innerText = w.dataset.desc;
      label.style.marginTop = '4px';
      label.style.fontSize = '0.9rem';
      label.style.color = '#eee';
      box.appendChild(label);
    }

    w.dataset.state = states[current];
  }

  box.onclick = () => {
    current = (current + 1) % states.length;
    render();
  };

  render();
  cont.appendChild(box);
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
