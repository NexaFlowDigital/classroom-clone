// widgets/soundLevel.js

export default function createSoundLevelWidget(cfg = {}) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = 'soundLevel';

  Object.assign(w.style, {
    left: cfg.left || '20px',
    top: cfg.top || '20px',
    width: cfg.width || '200px',
    height: cfg.height || '60px',
    zIndex: cfg.z || 1000,
    resize: 'both',
    position: 'absolute'
  });
  w.dataset.locked = cfg.locked || 'false';
  w.dataset.sens = cfg.sens || '0.2';

  const cont = document.createElement('div');
  cont.className = 'content';

  const meter = document.createElement('div');
  Object.assign(meter.style, {
    width: '0%',
    height: '20px',
    background: '#ccc',
    transition: 'width 0.1s ease',
    borderRadius: '4px'
  });
  cont.appendChild(meter);

  const sensitivity = parseFloat(w.dataset.sens);

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const data = new Uint8Array(analyser.frequencyBinCount);

      src.connect(analyser);

      function animate() {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i] - 128);
        }
        const volume = Math.min(1, sum / data.length / 128);
        meter.style.width = `${volume * 100}%`;
        meter.style.background = volume > sensitivity ? 'red' : 'green';
        requestAnimationFrame(animate);
      }

      animate();
    })
    .catch(err => {
      cont.textContent = '❌ Microphone error: ' + err.message;
    });

  w.appendChild(cont);
  document.getElementById('canvas').appendChild(w);

  return { w, cont };
}
