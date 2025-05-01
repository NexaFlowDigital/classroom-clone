// widgets/screenShare.js

export default function createScreenShareWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'screenShare';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '300px',
    height: cfg.height || '200px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });

  const cont = document.createElement('div');
  cont.className = 'content';

  navigator.mediaDevices.getDisplayMedia({ video: true })
    .then(stream => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      Object.assign(video.style, {
        flex: '1',
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      });
      cont.appendChild(video);
    })
    .catch(err => {
      cont.textContent = '❌ Screen share error: ' + err.message;
    });

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
