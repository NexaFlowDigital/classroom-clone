// script.js

// ─── In‐Memory Screens ───
let screens = { 'Screen 1': [] };
let activeScreen = 'Screen 1';
let topZ = 1000, bottomZ = 0;

// ─── Widget ResizeObserver ───
const widgetResizeObserver = new ResizeObserver(entries => {
  entries.forEach(({ target }) => {
    if (target.dataset.type === 'draw') {
      const canvas = target.querySelector('canvas');
      const bar    = target.querySelector('.widget-toolbar');
      if (!canvas || !bar) return;
      const rect = target.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height - bar.getBoundingClientRect().height;
    }
  });
});

// ─── Drag & Resize Utility ───
function makeDraggable(el) {
  let dx, dy, dragging = false;
  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('widget-settings-icon')) return;
    if (el.dataset.locked === 'true') return;
    dragging = true;
    dx = e.clientX - el.offsetLeft;
    dy = e.clientY - el.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = `${e.clientX - dx}px`;
    el.style.top  = `${e.clientY - dy}px`;
  });
  document.addEventListener('mouseup', () => {
    if (dragging) saveCurrentScreen();
    dragging = false;
    document.body.style.userSelect = '';
  });
}

// ─── Create Widget Shell ───
function createWidget(type, cfg) {
  const w = document.createElement('div');
  w.className = 'widget';
  w.dataset.type = type;

  // restore or defaults
  if (cfg) {
    ['left','top','width','height','z','locked'].forEach(p => {
      if (cfg[p] != null) {
        if (p === 'locked') w.dataset.locked = cfg[p];
        else w.style[p] = cfg[p];
      }
    });
    if (cfg.z) w.style.zIndex = cfg.z;
  } else {
    w.style.left   = '20px';
    w.style.top    = '20px';
    w.style.width  = '200px';
    w.style.height = '200px';
    w.style.zIndex = ++topZ;
    w.dataset.z    = w.style.zIndex;
    w.dataset.locked = 'false';
  }
  w.style.resize = w.dataset.locked==='true' ? 'none' : 'both';

  // content container
  const cont = document.createElement('div');
  cont.className = 'content';
  w.appendChild(cont);

  // settings icon
  const icon = document.createElement('div');
  icon.className = 'widget-settings-icon';
  icon.innerText = '⚙️';
  w.appendChild(icon);

  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  widgetResizeObserver.observe(w);

  // open settings on gear click
  icon.addEventListener('click', e => {
    e.stopPropagation();
    openWidgetSettings(w);
  });

  return { w, cont };
}

// ─── Remove old Background option ───
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('widgetSelect');
  sel.querySelector('option[value="setBackground"]')?.remove();
});

// ─── Screen/Tab Logic ───
function initScreens() {
  renderScreenTabs();
  loadScreen(activeScreen);
}
function persistScreens() {
  // TODO: push to Firebase
}
function renderScreenTabs() {
  const tabs = document.getElementById('screenTabs');
  tabs.innerHTML = '';
  Object.keys(screens).forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'screenTab' + (name===activeScreen?' active':'');
    btn.innerText = name;
    btn.onclick = () => switchScreen(name);
    tabs.appendChild(btn);
  });
  const add = document.createElement('button');
  add.id = 'addScreen'; add.innerText = '+';
  add.onclick = () => {
    const nm = prompt('New screen name:');
    if (nm && !screens[nm]) {
      screens[nm] = [];
      persistScreens();
      renderScreenTabs();
      switchScreen(nm);
    }
  };
  tabs.appendChild(add);
}
function saveCurrentScreen() {
  const arr = [];
  document.querySelectorAll('.widget').forEach(w => {
    const s = getComputedStyle(w);
    arr.push({
      type:   w.dataset.type,
      left:   s.left,
      top:    s.top,
      width:  s.width,
      height: s.height,
      z:      w.style.zIndex,
      html:   w.querySelector('.content').innerHTML,
      locked: w.dataset.locked
    });
  });
  screens[activeScreen] = arr;
  persistScreens();
}
function clearCanvas() {
  document.getElementById('canvas').innerHTML = '';
}
function loadScreen(name) {
  clearCanvas();
  (screens[name]||[]).forEach(cfg => {
    const { w, cont } = widgetRegistry[cfg.type](cfg);
    cont.innerHTML = cfg.html;
    w.dataset.locked = cfg.locked;
    w.style.resize = cfg.locked==='true'?'none':'both';
  });
  activeScreen = name;
  persistScreens();
  document.querySelectorAll('.screenTab').forEach(b => {
    b.classList.toggle('active', b.innerText===name);
  });
}
function switchScreen(name) {
  saveCurrentScreen();
  loadScreen(name);
}

// ─── Annotation Layer ───
let annotating=false, annoCanvas, annoCtx, annoHistory=[];
function initAnnotation() {
  if (annoCanvas) return;
  const cv = document.getElementById('canvas');
  annoCanvas = document.createElement('canvas');
  annoCanvas.width  = cv.clientWidth;
  annoCanvas.height = cv.clientHeight;
  Object.assign(annoCanvas.style, {
    position:'absolute',top:0,left:0,zIndex:400,pointerEvents:'none'
  });
  cv.appendChild(annoCanvas);
  annoCtx = annoCanvas.getContext('2d');
  annoCtx.lineCap = 'round';
  annoCanvas.onmousedown = e => {
    if (!annotating) return;
    annoCtx.beginPath();
    annoCtx.moveTo(e.offsetX, e.offsetY);
    annoCanvas.onmousemove = ev => {
      annoCtx.lineTo(ev.offsetX, ev.offsetY);
      annoCtx.stroke();
    };
  };
  document.onmouseup = () => {
    annoCanvas.onmousemove = null;
    annoHistory.push(annoCanvas.toDataURL());
    saveCurrentScreen();
  };
}

// ─── Widget Settings Panel ───
const widgetSettingsPanel = document.getElementById('widgetSettingsPanel');
function openWidgetSettings(widget) {
  widgetSettingsPanel.innerHTML = '';
  widgetSettingsPanel.classList.remove('hidden');

  // Layer / Delete / Lock controls
  const gen = document.createElement('div');
  gen.innerHTML = `
    <button id="bringFront">Bring to Front</button>
    <button id="sendBack">Send to Back</button>
    <button id="moveForward">Forward</button>
    <button id="moveBackward">Backward</button>
    <button id="delWidget">🗑️ Delete</button>
    <label><input type="checkbox" id="lockWidget" ${widget.dataset.locked==='true'?'checked':''}/> Lock</label>
    <hr/>
  `;
  widgetSettingsPanel.appendChild(gen);

  const r = widget.getBoundingClientRect();
  widgetSettingsPanel.style.top  = (r.bottom + window.scrollY + 4) + 'px';
  widgetSettingsPanel.style.left = (r.left   + window.scrollX)        + 'px';

  // Handlers
  gen.querySelector('#bringFront').onclick = () => {
    widget.style.zIndex = ++topZ;
    saveCurrentScreen();
    widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#sendBack').onclick = () => {
    widget.style.zIndex = --bottomZ;
    saveCurrentScreen();
    widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveForward').onclick = () => {
    widget.style.zIndex = (+widget.style.zIndex + 1);
    saveCurrentScreen();
    widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveBackward').onclick = () => {
    widget.style.zIndex = (+widget.style.zIndex - 1);
    saveCurrentScreen();
    widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#delWidget').onclick = () => {
    widget.remove();
    saveCurrentScreen();
    widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#lockWidget').onchange = e => {
    widget.dataset.locked = e.target.checked;
    widget.style.resize = e.target.checked ? 'none' : 'both';
    saveCurrentScreen();
  };

  // Widget-specific settings
  const type = widget.dataset.type;
  if (widgetRegistry[type].settings) {
    widgetRegistry[type].settings(widget, widgetSettingsPanel);
  }
}
document.addEventListener('click', e => {
  if (
    !e.target.closest('#widgetSettingsPanel') &&
    !e.target.closest('.widget-settings-icon')
  ) {
    widgetSettingsPanel.classList.add('hidden');
  }
});

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
  initScreens();

  // Toolbar collapse
  const collapseBtn = document.getElementById('collapseBtn');
  const tools       = document.getElementById('tools');
  collapseBtn.onclick = () => {
    const hidden = tools.style.display==='none';
    tools.style.display = hidden?'flex':'none';
    collapseBtn.innerText = hidden?'▲':'▼';
  };

  // Global settings panel
  const sp = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick = () => sp.classList.remove('hidden');
  document.getElementById('closeSettings').onclick = () => sp.classList.add('hidden');
  document.getElementById('themeToolbar').oninput = e =>
    document.documentElement.style.setProperty('--toolbar-bg', e.target.value);
  document.getElementById('themeWidget').oninput = e =>
    document.documentElement.style.setProperty('--widget-header-bg', e.target.value);
  document.getElementById('canvasBg').oninput = e =>
    document.getElementById('canvas').style.background = e.target.value;

  // Annotation toggle
  const annoBtn = document.getElementById('annotateTool');
  annoBtn.onclick = () => {
    annotating = !annotating;
    annoBtn.style.opacity = annotating?'1':'0.6';
    document.getElementById('annoControls').style.display = annotating?'flex':'none';
    initAnnotation();
    annoCanvas.style.pointerEvents = annotating?'auto':'none';
    annoCtx.globalCompositeOperation = 'source-over';
  };
  document.getElementById('penBtn').onclick   = () => annoCtx.globalCompositeOperation = 'source-over';
  document.getElementById('penColor').oninput = e => annoCtx.strokeStyle = e.target.value;
  document.getElementById('penSize').oninput  = e => annoCtx.lineWidth = e.target.value;
  document.getElementById('eraserBtn').onclick= () => annoCtx.globalCompositeOperation = 'destination-out';
  document.getElementById('undoBtn').onclick  = () => {
    if (!annoHistory.length) return;
    annoHistory.pop();
    annoCtx.clearRect(0,0,annoCanvas.width,annoCanvas.height);
    const last = annoHistory[annoHistory.length-1];
    if (last) {
      const img = new Image();
      img.onload = () => annoCtx.drawImage(img,0,0);
      img.src = last;
    }
    saveCurrentScreen();
  };

  // Export screen state
  document.getElementById('exportBtn').onclick = () => {
    const data = JSON.stringify({ screens, activeScreen }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'classroom_screens.json';
    a.click();
  };

  // Import screen state
  document.getElementById('importBtn').onclick = () =>
    document.getElementById('importFile').click();
  document.getElementById('importFile').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        screens = data.screens || {};
        activeScreen = data.activeScreen || Object.keys(screens)[0];
        renderScreenTabs();
        loadScreen(activeScreen);
        persistScreens();
        alert('Import successful');
      } catch {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  // Select tool
  let selecting = false;
  const selectBtn = document.getElementById('selectTool');
  function onSelect(e) {
    if (!selecting) return;
    const w = e.target.closest('.widget');
    if (w) {
      w.classList.toggle('selected');
      e.stopPropagation();
    }
  }
  selectBtn.onclick = () => {
    selecting = !selecting;
    selectBtn.style.opacity = selecting?'1':'0.6';
    document.addEventListener('click', onSelect, true);
    if (!selecting) document.removeEventListener('click', onSelect, true);
  };

  // Add widget
  document.getElementById('widgetSelect').onchange = e => {
    const type = e.target.value;
    if (type && widgetRegistry[type]) {
      widgetRegistry[type]();
      saveCurrentScreen();
    }
    e.target.value = '';
  };
});

// ─── Helpers ───
function formatTime(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ─── Widget Registry ───
const widgetRegistry = {
  // ─ Screen Share ─
  screenShare: cfg => {
    const {w,cont} = createWidget('Screen Share', cfg);
    navigator.mediaDevices.getDisplayMedia({video:true})
      .then(s => {
        const v = document.createElement('video');
        v.srcObject = s;
        v.autoplay = true;
        Object.assign(v.style, {width:'100%', height:'100%', objectFit:'cover'});
        cont.append(v);
      })
      .catch(err => cont.innerText = '❌ ' + err.message);
    return {w, cont};
  },

  // ─ Text ─
  text: cfg => {
    const {w,cont} = createWidget('Text', cfg);
    const d = document.createElement('div');
    d.contentEditable = true;
    d.innerHTML = cfg?.html || 'Click to edit…';
    d.oninput = () => {
      w.dataset.html = d.innerHTML;
      saveCurrentScreen();
    };
    cont.append(d);
    return {w, cont};
  },

  // ─ Clock ─
  clock: () => {
    const {w,cont} = createWidget('Clock');
    const d = document.createElement('div');
    d.style.fontSize = '1.2em';
    cont.append(d);
    setInterval(() => { d.innerText = new Date().toLocaleTimeString(); }, 500);
    return {w, cont};
  },

  // ─ Timer ─
  timer: cfg => {
    const {w,cont} = createWidget('Timer', cfg);
    let sec = parseInt(cfg?.seconds) || 0, id;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = sec;
    input.min = 0;
    const btnSet = document.createElement('button');
    btnSet.innerText = 'Set';
    const disp = document.createElement('div');
    disp.innerText = formatTime(sec);
    const btnStart = document.createElement('button');
    btnStart.innerText = '▶️';
    const btnPause = document.createElement('button');
    btnPause.innerText = '⏸️';
    const btnReset = document.createElement('button');
    btnReset.innerText = '↺';

    btnSet.onclick = () => {
      sec = parseInt(input.value) || 0;
      disp.innerText = formatTime(sec);
      w.dataset.seconds = sec;
      saveCurrentScreen();
    };
    btnStart.onclick = () => {
      if (!id) id = setInterval(() => {
        sec++;
        disp.innerText = formatTime(sec);
        w.dataset.seconds = sec;
        saveCurrentScreen();
      }, 1000);
    };
    btnPause.onclick = () => { clearInterval(id); id = null; };
    btnReset.onclick = () => {
      clearInterval(id);
      id = null;
      sec = 0;
      disp.innerText = formatTime(sec);
      w.dataset.seconds = 0;
      saveCurrentScreen();
    };

    cont.append(input, btnSet, disp, btnStart, btnPause, btnReset);
    return {w, cont};
  },

  // ─ Visual Timer ─
  visualTimer: cfg => {
    const {w,cont} = createWidget('Visual Timer', cfg);
    let total = parseInt(cfg?.total) || 60;
    let rem   = parseInt(cfg?.remaining) || total;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = total;
    input.min = 1;
    const btnSet = document.createElement('button');
    btnSet.innerText = 'Set';
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const x = c.getContext('2d');
    let id;

    function draw() {
      x.clearRect(0,0,120,120);
      const pct = rem/total;
      x.beginPath();
      x.arc(60,60,54,-Math.PI/2, -Math.PI/2 + 2*Math.PI*pct);
      x.lineWidth = 10;
      x.stroke();
      x.font = '16px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(formatTime(rem), 60, 60);
      w.dataset.total = total;
      w.dataset.remaining = rem;
      saveCurrentScreen();
    }

    btnSet.onclick = () => {
      clearInterval(id);
      total = parseInt(input.value) || 60;
      rem = total;
      draw();
    };

    draw();
    id = setInterval(() => {
      if (rem > 0) {
        rem--;
        draw();
      } else {
        clearInterval(id);
      }
    }, 1000);

    cont.append(input, btnSet, c);
    return {w, cont};
  },

  // ─ Event Countdown ─
  eventCountdown: cfg => {
    const {w,cont} = createWidget('Countdown', cfg);
    const when = cfg?.when ? new Date(cfg.when)
      : new Date(prompt('Target (YYYY-MM-DD HH:MM):'));
    w.dataset.when = when;
    const d = document.createElement('div');
    cont.append(d);

    function upd() {
      const diff = when - new Date();
      if (diff <= 0) {
        d.innerText = '🎉';
        return;
      }
      const days = Math.floor(diff/864e5),
            hrs  = Math.floor(diff%864e5/36e5),
            mins = Math.floor(diff%36e5/6e4),
            secs = Math.floor(diff%6e4/1000);
      d.innerText = `${days}d ${hrs}h ${mins}m ${secs}s`;
      saveCurrentScreen();
    }

    upd(); setInterval(upd, 1000);
    return {w, cont};
  },

  // ─ Poll ─
  poll: cfg => {
    const {w,cont} = createWidget('Poll', cfg);
    const q = cfg?.q || prompt('Question:') || '...?';
    const opts = cfg?.opts ? cfg.opts.split(',') : prompt('Options, comma:','Yes,No').split(',');
    const counts = cfg?.counts ? cfg.counts.split(',').map(Number) : opts.map(_=>0);
    w.dataset.q = q;
    w.dataset.opts = opts.join(',');
    const box = document.createElement('div');
    box.innerHTML = `<strong>${q}</strong><br>`;
    opts.forEach((o,i) => {
      const btn = document.createElement('button');
      function upd() { btn.innerText = `${o.trim()} (${counts[i]})`; }
      btn.onclick = () => {
        counts[i]++; w.dataset.counts = counts.join(','); upd(); saveCurrentScreen();
      };
      upd(); box.append(btn, document.createElement('br'));
    });
    cont.append(box);
    return {w, cont};
  },

  // ─ Timetable ─
  timetable: cfg => {
    const {w,cont} = createWidget('Timetable', cfg);
    const tbl = document.createElement('table');
    tbl.border = 1;
    tbl.contentEditable = true;
    tbl.innerHTML = cfg?.html || `
      <tr><th>Time</th><th>Activity</th></tr>
      <tr><td>8:00</td><td>…</td></tr>`;
    tbl.oninput = () => {
      w.dataset.html = tbl.innerHTML;
      saveCurrentScreen();
    };
    cont.append(tbl);
    return {w, cont};
  },

  // ─ Randomizer ─
  randomizer: cfg => {
    const {w,cont} = createWidget('Randomizer', cfg);
    const items = cfg?.items ? cfg.items.split(',') : prompt('Items, comma:','Alice,Bob,Carol').split(',');
    w.dataset.items = items.join(',');
    const btn = document.createElement('button'), d = document.createElement('div');
    btn.innerText = 'Pick one';
    btn.onclick = () => { d.innerText = items[Math.floor(Math.random()*items.length)].trim(); };
    cont.append(btn, d);
    return {w, cont};
  },

  // ─ Group Maker ─
  groupMaker: cfg => {
    const {w,cont} = createWidget('Group Maker', cfg);
    const names = cfg?.names ? cfg.names.split(',') : prompt('Names, comma:','A,B,C').split(',');
    const size  = parseInt(cfg?.size) || parseInt(prompt('Group size:'),10) || 2;
    w.dataset.names = names.join(',');
    w.dataset.size  = size;
    const btn = document.createElement('button'), d = document.createElement('div');
    btn.innerText = 'Make groups';
    btn.onclick = () => {
      const arr = [...names], out = [];
      while (arr.length) out.push(arr.splice(0,size));
      d.innerHTML = out.map(g=>g.join(', ')).join('<br>');
      saveCurrentScreen();
    };
    cont.append(btn, d);
    return {w, cont};
  },

  // ─ Dice ─
  dice: () => {
    const {w,cont} = createWidget('Dice');
    const btn = document.createElement('button'), d = document.createElement('div');
    btn.innerText = '🎲';
    d.style.fontSize = '3rem';
    btn.onclick = () => { d.innerText = Math.floor(Math.random()*6) + 1; };
    cont.append(btn, d);
    return {w, cont};
  },

  // ─ Traffic Light ─
  trafficLight: () => {
    const {w,cont} = createWidget('Traffic Light');
    const box = document.createElement('div'), circs = [];
    box.className = 'traffic-box';
    ['red','yellow','green'].forEach(c => {
      const cc = document.createElement('div');
      cc.className = 'traffic-light-circle';
      box.append(cc); circs.push(cc);
    });
    let idx = 0;
    const btn = document.createElement('button');
    btn.innerText = 'Next';
    btn.onclick = () => {
      circs.forEach(c => c.style.background = '#444');
      circs[idx].style.background = ['red','yellow','green'][idx];
      idx = (idx+1)%3;
      saveCurrentScreen();
    };
    cont.append(box, btn);
    return {w, cont};
  },

  // ─ Scoreboard ─
  scoreboard: () => {
    const {w,cont} = createWidget('Scoreboard');
    const teams = prompt('Teams, comma:','A,B').split(',');
    teams.forEach(t => {
      let sc = 0;
      const row = document.createElement('div');
      const lbl  = document.createElement('span');
      const disp = document.createElement('span');
      const plus = document.createElement('button');
      const minus= document.createElement('button');
      lbl.innerText   = t.trim() + ': ';
      disp.innerText  = sc;
      plus.innerText  = '+';
      minus.innerText = '-';
      plus.onclick    = () => { disp.innerText = ++sc; saveCurrentScreen(); };
      minus.onclick   = () => { disp.innerText = --sc; saveCurrentScreen(); };
      row.append(lbl, disp, plus, minus);
      cont.append(row);
    });
    return {w, cont};
  },

  // ─ Sound Level ─
  soundLevel: cfg => {
    const {w,cont} = createWidget('Sound Level', cfg);
    let g = parseFloat(cfg?.gThreshold) || 0.2;
    let y = parseFloat(cfg?.yThreshold) || 0.5;
    cont.innerHTML = `
      <label>✅ ≤<input type="number" min="0" max="1" step="0.01" value="${g}" id="gIn"/></label>
      <label>🟡 ≤<input type="number" min="0" max="1" step="0.01" value="${y}" id="yIn"/></label>
      <div id="bar" style="height:20px;margin-top:8px;"></div>
    `;
    const bar = cont.querySelector('#bar'),
          gIn = cont.querySelector('#gIn'),
          yIn = cont.querySelector('#yIn');
    gIn.oninput = e => { g = parseFloat(e.target.value); w.dataset.gThreshold = g; saveCurrentScreen(); };
    yIn.oninput = e => { y = parseFloat(e.target.value); w.dataset.yThreshold = y; saveCurrentScreen(); };
    navigator.mediaDevices.getUserMedia({audio:true}).then(stream => {
      const ac = new AudioContext(), src = ac.createMediaStreamSource(stream),
            an = ac.createAnalyser(), data = new Uint8Array(an.fftSize);
      src.connect(an);
      (function loop(){
        an.getByteTimeDomainData(data);
        let sum=0; data.forEach(v=>sum+=Math.abs(v-128));
        const vol = Math.min(1, sum/data.length/128);
        bar.style.width = (vol*100)+'%';
        bar.style.background = vol<=g?'green':vol<=y?'yellow':'red';
        requestAnimationFrame(loop);
      })();
    });
    return {w, cont};
  },

  // ─ Work Symbols ─
  workSymbols: () => {
    const {w,cont} = createWidget('Work Symbols');
    const syms = ['✏️','☕️','✅','🔴'];
    let i = 0;
    const btn = document.createElement('button'), d = document.createElement('div');
    d.style.fontSize='2rem';
    btn.innerText='Next';
    btn.onclick = () => { d.innerText=syms[i]; i=(i+1)%syms.length; saveCurrentScreen(); };
    cont.append(d, btn);
    return {w, cont};
  },

  // ─ Stickers ─
  stickers: () => {
    const {w,cont} = createWidget('Stickers');
    const url = prompt('Sticker URL:');
    if (!url) return {w, cont};
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth='100%';
    cont.append(img);
    saveCurrentScreen();
    return {w, cont};
  },

  // ─ Image ─
  image: () => {
    const {w,cont} = createWidget('Image');
    const url = prompt('Image URL:');
    if (!url) return {w, cont};
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth='100%';
    cont.append(img);
    saveCurrentScreen();
    return {w, cont};
  },

  // ─ Video ─
  video: () => {
    const {w,cont} = createWidget('Video');
    const url = prompt('YouTube URL/ID:');
    if (!url) return {w, cont};
    const id  = url.includes('v=') ? url.split('v=')[1] : url;
    const ifr = document.createElement('iframe');
    ifr.src = `https://www.youtube.com/embed/${id}`;
    Object.assign(ifr.style, {width:'100%', height:'100%', border:'none'});
    cont.append(ifr);
    saveCurrentScreen();
    return {w, cont};
  },

  // ─ Embed ─
  embed: cfg => {
    const {w,cont} = createWidget('Embed', cfg);
    const ifr = document.createElement('iframe');
    Object.assign(ifr.style, {width:'100%', height:'100%', border:'none'});
    cont.append(ifr);
    function setURL(u) {
      if (u.includes('docs.google.com/presentation')) {
        u = u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src = u;
      w.dataset.url = u;
      saveCurrentScreen();
    }
    if (cfg?.url) setURL(cfg.url);
    w.querySelector('.widget-settings-icon').onclick = () => {
      const u = prompt('Embed URL:', w.dataset.url || '');
      if (u) setURL(u);
    };
    return {w, cont};
  },

  // ─ Hyperlink ─
  hyperlink: () => {
    const {w,cont} = createWidget('Hyperlink');
    const url  = prompt('URL:');
    const text = prompt('Link text:') || url;
    if (url) {
      const a = document.createElement('a');
      a.href   = url;
      a.target = '_blank';
      a.innerText = text;
      cont.append(a);
      saveCurrentScreen();
    }
    return {w, cont};
  },

  // ─ QR Code ─
  qrCode: cfg => {
    const {w,cont} = createWidget('QR Code', cfg);
    const data = cfg?.data || prompt('Text/URL:');
    if (data) {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=150x150`;
      cont.append(img);
      w.dataset.data = data;
      saveCurrentScreen();
    }
    return {w, cont};
  },

  // ─ Stopwatch ─
  stopwatch: cfg => {
    const {w,cont} = createWidget('Stopwatch', cfg);
    let running=false, start=0, elapsed=+(cfg?.elapsed||0), interval;
    const disp = document.createElement('div');
    disp.style.flex='1'; disp.style.textAlign='center'; disp.style.fontSize='2rem';
    cont.append(disp);
    const bar = document.createElement('div');
    bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="swStart">▶️</button>
      <button id="swStop">⏸️</button>
      <button id="swLap">🏁</button>
    `;
    cont.append(bar);
    const laps = document.createElement('div');
    laps.style.flex='1'; laps.style.overflow='auto';
    cont.append(laps);

    function update(){
      const ms = running ? (Date.now()-start+elapsed) : elapsed;
      disp.innerText = formatTime(Math.floor(ms/1000));
    }
    bar.querySelector('#swStart').onclick = () => {
      if (!running) {
        running = true;
        start = Date.now();
        interval = setInterval(update, 500);
      }
    };
    bar.querySelector('#swStop').onclick = () => {
      if (running) {
        running = false;
        clearInterval(interval);
        elapsed += Date.now()-start;
        saveCurrentScreen();
      }
    };
    bar.querySelector('#swLap').onclick = () => {
      const lap = document.createElement('div');
      lap.innerText = disp.innerText;
      laps.append(lap);
    };
    update();
    return {w, cont};
  },

  // ─ Draw ─
  draw: cfg => {
    const {w,cont} = createWidget('Draw', cfg);
    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML=`
      <button id="drawPen">✏️</button>
      <button id="drawEraser">🧹</button>
      <input type="color" id="drawColor" value="#000"/>
      <input type="range" id="drawSize" min="1" max="20" value="4"/>
    `;
    cont.append(bar);
    const canvas = document.createElement('canvas');
    cont.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    let drawing = false;

    canvas.onmousedown = e => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };
    canvas.onmousemove = e => {
      if (!drawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    };
    document.onmouseup = () => {
      if (drawing) {
        drawing = false;
        saveCurrentScreen();
      }
    };

    bar.querySelector('#drawPen').onclick    = () => ctx.globalCompositeOperation='source-over';
    bar.querySelector('#drawEraser').onclick = () => ctx.globalCompositeOperation='destination-out';
    bar.querySelector('#drawColor').oninput   = e => ctx.strokeStyle = e.target.value;
    bar.querySelector('#drawSize').oninput    = e => ctx.lineWidth = e.target.value;

    widgetResizeObserver.observe(w);
    return {w, cont};
  },

  // ─ Calendar ─
  calendar: cfg => {
    const {w,cont} = createWidget('Calendar', cfg);
    widgetRegistry.calendar.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Start day:
          <select id="startDay">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
          </select>
        </label>
        <label><input type="checkbox" id="showWeekends" checked/> Show weekends</label>
      `;
      panel.querySelector('#startDay').onchange = e => {
        w.dataset.startDay = e.target.value;
        render(); saveCurrentScreen();
      };
      panel.querySelector('#showWeekends').onchange = e => {
        w.dataset.showWeekends = e.target.checked;
        render(); saveCurrentScreen();
      };
    };

    const bar = document.createElement('div');
    bar.className = 'widget-toolbar';
    bar.innerHTML = `<button id="prev">‹</button><span id="title"></span><button id="next">›</button>`;
    cont.append(bar);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7,1fr)';
    grid.style.flex = '1';
    grid.style.gap  = '2px';
    cont.append(grid);

    let date = cfg?.date ? new Date(cfg.date) : new Date();
    w.dataset.date = date.toISOString();

    function render() {
      grid.innerHTML = '';
      const showWd = w.dataset.showWeekends !== 'false';
      const titleEl = bar.querySelector('#title');
      titleEl.innerText = date.toLocaleString('default', { month:'long', year:'numeric' });

      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((d,i) => {
        if (!showWd && (i===0||i===6)) return;
        const hd = document.createElement('div');
        hd.style.fontWeight = 'bold';
        hd.innerText = d;
        grid.append(hd);
      });

      const fd = new Date(date.getFullYear(), date.getMonth(),1).getDay();
      for (let i=0;i<fd;i++) {
        if (showWd || (i>0 && i<6)) grid.append(document.createElement('div'));
      }

      const days = new Date(date.getFullYear(), date.getMonth()+1,0).getDate();
      for (let d=1; d<=days; d++) {
        const cell = document.createElement('div');
        cell.innerText = d;
        cell.style.cursor = 'pointer';
        cell.onclick = () => { w.dataset.selected = d; saveCurrentScreen(); };
        grid.append(cell);
      }
    }

    bar.querySelector('#prev').onclick = () => { date.setMonth(date.getMonth()-1); render(); };
    bar.querySelector('#next').onclick = () => { date.setMonth(date.getMonth()+1); render(); };
    render();

    return {w, cont};
  },

  // ─ Rest Room ─
  restroom: () => {
    const {w,cont} = createWidget('Rest Room');
    let ok = false;
    const d   = document.createElement('div');
    const btn = document.createElement('button');
    d.style.fontSize='1.5em';
    d.style.textAlign='center';
    btn.innerText='Toggle';
    btn.onclick = () => {
      ok = !ok;
      d.innerText = ok ? '✅ Allowed' : '❌ Closed';
      d.style.color = ok ? 'green' : 'red';
      w.dataset.ok = ok;
      saveCurrentScreen();
    };
    d.innerText = '❌ Closed';
    cont.append(d,btn);
    return {w, cont};
  }
};
