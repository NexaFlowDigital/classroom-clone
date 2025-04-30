// --- DRAG & DROP UTILS ---
function makeDraggable(el) {
  let offsetX, offsetY, isDown = false;
  const header = el.querySelector('.header');
  header.addEventListener('mousedown', e => {
    isDown = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!isDown) return;
    el.style.left = (e.clientX - offsetX) + 'px';
    el.style.top = (e.clientY - offsetY) + 'px';
  });
  document.addEventListener('mouseup', () => {
    isDown = false;
    document.body.style.userSelect = '';
  });
}

// helper to format seconds → M:SS
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// helper to wrap a widget
function createWidget(title) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.style.left = '20px';
  w.style.top = '20px';
  w.innerHTML = `
    <div class="header">${title} <span class="close">✖</span></div>
  `;
  w.querySelector('.close').onclick = () => w.remove();
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  return w;
}

// --- WIDGET REGISTRY ---
const widgetRegistry = {
  screenShare: () => {
    const w = createWidget('Screen Share');
    navigator.mediaDevices.getDisplayMedia({ video: true })
      .then(stream => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.width = 320;
        video.height = 180;
        w.appendChild(video);
      })
      .catch(err => {
        w.appendChild(document.createTextNode('❌ Share failed: ' + err.message));
      });
    return w;
  },

  setBackground: () => {
    const color = prompt('Enter a background color or image URL:');
    if (!color) return;
    const canvas = document.getElementById('canvas');
    if (color.startsWith('http')) {
      canvas.style.background = `url('${color}') center/cover no-repeat`;
    } else {
      canvas.style.background = color;
    }
  },

  text: () => {
    const w = createWidget('Text');
    const area = document.createElement('div');
    area.contentEditable = true;
    area.innerText = 'Click to edit…';
    w.appendChild(area);
    return w;
  },

  clock: () => {
    const w = createWidget('Clock');
    const disp = document.createElement('div');
    disp.style.fontSize = '1.2em';
    w.appendChild(disp);
    setInterval(() => {
      disp.innerText = new Date().toLocaleTimeString();
    }, 500);
    return w;
  },

  timer: () => {
    const w = createWidget('Timer');
    let seconds = parseInt(prompt('Start seconds:'), 10) || 0;
    const disp = document.createElement('div');
    disp.innerText = formatTime(seconds);
    w.appendChild(disp);
    const btn = document.createElement('button');
    btn.innerText = 'Start/Stop';
    let intId;
    btn.onclick = () => {
      if (intId) {
        clearInterval(intId);
        intId = null;
      } else {
        intId = setInterval(() => {
          seconds++;
          disp.innerText = formatTime(seconds);
        }, 1000);
      }
    };
    w.appendChild(btn);
    return w;
  },

  visualTimer: () => {
    const w = createWidget('Visual Timer');
    let total = parseInt(prompt('Total seconds:'), 10) || 60;
    let rem = total;
    const canvas = document.createElement('canvas');
    const size = 120;
    canvas.width = canvas.height = size;
    w.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    function draw() {
      const pct = rem / total;
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 - 5, -Math.PI/2, (-Math.PI/2) + 2*Math.PI*pct);
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatTime(rem), size/2, size/2);
    }
    draw();
    const intId = setInterval(() => {
      if (rem > 0) { rem--; draw(); }
      else clearInterval(intId);
    }, 1000);
    return w;
  },

  eventCountdown: () => {
    const w = createWidget('Event Countdown');
    const when = new Date(prompt('Enter target date/time (YYYY-MM-DD HH:MM):'));
    const disp = document.createElement('div');
    w.appendChild(disp);
    function update() {
      const diff = when - new Date();
      if (diff <= 0) { disp.innerText = '🎉'; return; }
      const d = Math.floor(diff/864e5);
      const h = Math.floor(diff%864e5/36e5);
      const m = Math.floor(diff%36e5/6e4);
      const s = Math.floor(diff%6e4/1000);
      disp.innerText = `${d}d ${h}h ${m}m ${s}s`;
    }
    update(); setInterval(update, 1000);
    return w;
  },

  poll: () => {
    const w = createWidget('Poll');
    const q = prompt('Poll question:') || '...?';
    const opts = prompt('Comma-separate options:','Yes,No').split(',');
    const disp = document.createElement('div');
    disp.innerHTML = `<strong>${q}</strong><br/>`;
    const counts = opts.map(_=>0);
    opts.forEach((opt,i) => {
      const btn = document.createElement('button');
      btn.innerText = `${opt.trim()} (0)`;
      btn.onclick = () => {
        counts[i]++;
        btn.innerText = `${opt.trim()} (${counts[i]})`;
      };
      disp.appendChild(btn);
      disp.appendChild(document.createElement('br'));
    });
    w.appendChild(disp);
    return w;
  },

  timetable: () => {
    const w = createWidget('Timetable');
    const table = document.createElement('table');
    table.border = 1;
    table.innerHTML = `
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>
      <tr><td>9:00</td><td>…</td></tr>
    `;
    w.appendChild(table);
    return w;
  },

  randomizer: () => {
    const w = createWidget('Randomizer');
    const list = prompt('Enter items, comma-separated:','Alice,Bob,Carol').split(',');
    const btn = document.createElement('button');
    const disp = document.createElement('div');
    btn.innerText = 'Pick one';
    btn.onclick = () => {
      const pick = list[Math.floor(Math.random()*list.length)].trim();
      disp.innerText = pick;
    };
    w.appendChild(btn);
    w.appendChild(disp);
    return w;
  },

  groupMaker: () => {
    const w = createWidget('Group Maker');
    const names = prompt('Names, comma-separated:','Alice,Bob,Carol,Dan').split(',');
    const size = parseInt(prompt('Group size:'),10) || 2;
    const btn = document.createElement('button');
    const disp = document.createElement('div');
    btn.innerText = 'Make groups';
    btn.onclick = () => {
      const arr = names.slice(), groups = [];
      while (arr.length) groups.push(arr.splice(0, size));
      disp.innerHTML = groups.map(g => `<div>${g.join(', ')}</div>`).join('');
    };
    w.appendChild(btn);
    w.appendChild(disp);
    return w;
  },

  dice: () => {
    const w = createWidget('Dice');
    const btn = document.createElement('button');
    const disp = document.createElement('div');
    btn.innerText = 'Roll 🎲';
    btn.onclick = () => disp.innerText = Math.floor(Math.random()*6) + 1;
    w.appendChild(btn);
    w.appendChild(disp);
    return w;
  },

  trafficLight: () => {
    const w = createWidget('Traffic Light');
    const colors = ['red','yellow','green'], circles = [];
    const container = document.createElement('div');
    colors.forEach(c => {
      const d = document.createElement('div');
      d.style.width='30px'; d.style.height='30px';
      d.style.border='1px solid #333';
      d.style.borderRadius='50%';
      d.style.margin='4px auto';
      container.appendChild(d);
      circles.push(d);
    });
    let idx = 0;
    const btn = document.createElement('button');
    btn.innerText = 'Next';
    btn.onclick = () => {
      circles.forEach(d => d.style.background = '');
      circles[idx].style.background = colors[idx];
      idx = (idx + 1) % 3;
    };
    w.appendChild(container);
    w.appendChild(btn);
    return w;
  },

  scoreboard: () => {
    const w = createWidget('Scoreboard');
    const teams = prompt('Team names, comma-separated:','A,B').split(',');
    const container = document.createElement('div');
    teams.forEach(t => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      let score = 0;
      const disp = document.createElement('span');
      const plus = document.createElement('button');
      const minus = document.createElement('button');
      label.innerText = t.trim() + ': ';
      disp.innerText = score;
      plus.innerText = '+';
      minus.innerText = '-';
      plus.onclick = () => { disp.innerText = ++score; };
      minus.onclick = () => { disp.innerText = --score; };
      row.append(label, disp, plus, minus);
      container.appendChild(row);
    });
    w.appendChild(container);
    return w;
  },

  soundLevel: () => {
    const w = createWidget('Sound Level');
    const bar = document.createElement('div');
    bar.style.height = '20px';
    bar.style.width = '0';
    bar.style.background = 'green';
    w.appendChild(bar);
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      function update() {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        data.forEach(v => sum += Math.abs(v - 128));
        let vol = Math.min(1, sum / data.length / 128);
        bar.style.width = (vol * 100) + '%';
        requestAnimationFrame(update);
      }
      update();
    });
    return w;
  },

  workSymbols: () => {
    const w = createWidget('Work Symbols');
    const syms = ['✏️','☕️','✅','🔴'];
    let idx = 0;
    const btn = document.createElement('button');
    const disp = document.createElement('div');
    disp.style.fontSize = '2rem';
    btn.innerText = 'Next';
    btn.onclick = () => {
      disp.innerText = syms[idx];
      idx = (idx + 1) % syms.length;
    };
    w.appendChild(disp);
    w.appendChild(btn);
    return w;
  },

  stickers: () => {
    const w = createWidget('Stickers');
    const url = prompt('Sticker image URL:');
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    w.appendChild(img);
    return w;
  },

  image: () => {
    const w = createWidget('Image');
    const url = prompt('Image URL:');
    if (!url) return;
    const img = document.createElement('img');
    img.src = url;
    w.appendChild(img);
    return w;
  },

  video: () => {
    const w = createWidget('Video');
    const url = prompt('Video embed URL (YouTube etc):');
    if (!url) return;
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = 300;
    iframe.height = 200;
    w.appendChild(iframe);
    return w;
  },

  embed: () => {
    const w = createWidget('Embed');
    const url = prompt('URL to embed:');
    if (!url) return;
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = 300;
    iframe.height = 200;
    w.appendChild(iframe);
    return w;
  },

  hyperlink: () => {
    const w = createWidget('Hyperlink');
    const url = prompt('URL:');
    const text = prompt('Link text:') || url;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.innerText = text;
    w.appendChild(a);
    return w;
  }
};

// hook up toolbar dropdown
document.getElementById('widgetSelect').onchange = e => {
  const type = e.target.value;
  if (type && widgetRegistry[type]) widgetRegistry[type]();
  e.target.value = '';
};
