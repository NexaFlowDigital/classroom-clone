// widgets/webcam.js

export default function createWebcamWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'webcam';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '300px',
    height: cfg.height || '200px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';

  const cont = document.createElement('div');
  cont.className = 'content';

  const toolbar = document.createElement('div');
  toolbar.className = 'widget-toolbar';
  toolbar.innerHTML = `
    <button id="flip">Flip</button>
    <button id="rotate">Rotate</button>
  `;
  cont.appendChild(toolbar);

  const video = document.createElement('video');
  video.autoplay = true;
  Object.assign(video.style, {
    flex: '1',
    objectFit: 'cover',
    width: '100%',
    height: '100%'
  });
  cont.appendChild(video);

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      cont.innerHTML = '❌ Webcam error: ' + err.message;
    });

  let flipped = cfg.flipped === 'true';
  let rotated = cfg.rotated === 'true';

  function applyTransforms() {
    let transform = '';
    if (flipped) transform += 'scaleX(-1) ';
    if (rotated) transform += 'rotate(90deg)';
    video.style.transform = transform;
    w.dataset.flipped = flipped;
    w.dataset.rotated = rotated;
  }

  toolbar.querySelector('#flip').onclick = () => {
    flipped = !flipped;
    applyTransforms();
  };

  toolbar.querySelector('#rotate').onclick = () => {
    rotated = !rotated;
    applyTransforms();
  };

  applyTransforms();
  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
