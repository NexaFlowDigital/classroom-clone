// script.js

// ─── In-Memory Screen Store ───
let screens = { 'Screen 1': [] };
let activeScreen = 'Screen 1';
let topZ = 1000, bottomZ = 0;

// ─── Utility: Draggable & Resizable ───
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
  // Position & size from cfg
  if (cfg) {
    ['left','top','width','height','z','locked'].forEach(p => {
      if (cfg[p] !== undefined) {
        if (p === 'locked') w.dataset.locked = cfg.locked;
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
  w.style.resize = w.dataset.locked==='true'?'none':'both';

  // Content container
  const cont = document.createElement('div');
  cont.className = 'content';
  w.appendChild(cont);

  // Settings icon
  const icon = document.createElement('div');
  icon.className = 'widget-settings-icon';
  w.appendChild(icon);

  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);

  // Open settings on ⚙️ click
  w.addEventListener('click', e => {
    const rect = w.getBoundingClientRect();
    const isIcon =
      e.clientX >= rect.right - 24 &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.top + 24;
    if (isIcon) {
      e.stopPropagation();
      openWidgetSettings(w);
    }
  });

  return { w, cont };
}

// ─── Remove Background Widget Option ───
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('widgetSelect');
  const bgOpt = sel.querySelector('option[value="setBackground"]');
  if (bgOpt) bgOpt.remove();
});

// ─── Global Settings: Canvas Background ───
document.addEventListener('DOMContentLoaded', () => {
  const sp = document.getElementById('settingsPanel');
  const lbl = document.createElement('label');
  lbl.innerHTML = 'Canvas bg: <input type="color" id="canvasBg" value="#ffffff"/>';
  sp.insertBefore(lbl, sp.querySelector('#closeSettings'));
  document.getElementById('canvasBg').oninput = e => {
    document.getElementById('canvas').style.background = e.target.value;
    // TODO: Save global background to Firebase
  };
});

// ─── Screen/Tab Management ───
function initScreens() {
  renderScreenTabs();
  loadScreen(activeScreen);
}
function persistScreens() {
  // TODO: push 'screens' & 'activeScreen' to Firebase
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
      z:      s.zIndex,
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

// ─── Annotation ───
let annotating=false, annoCanvas, annoCtx, annoHistory=[];
function initAnnotation() {
  if (annoCanvas) return;
  const cv = document.getElementById('canvas');
  annoCanvas = document.createElement('canvas');
  annoCanvas.width = cv.clientWidth;
  annoCanvas.height = cv.clientHeight;
  Object.assign(annoCanvas.style,{
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
    saveCurrentScreen(); // TODO: Save to Firebase
  };
}

// ─── Widget Settings Panel ───
const widgetSettingsPanel = document.getElementById('widgetSettingsPanel');
function openWidgetSettings(widget) {
  widgetSettingsPanel.innerHTML = '';
  widgetSettingsPanel.classList.remove('hidden');

  // Common controls
  const gen = document.createElement('div');
  gen.innerHTML = `
    <button id="bringFront">Bring to Front</button>
    <button id="sendBack">Send to Back</button>
    <button id="moveForward">Move Forward</button>
    <button id="moveBackward">Move Backward</button>
    <button id="delWidget">🗑️ Delete</button>
    <label><input type="checkbox" id="lockWidget" ${widget.dataset.locked==='true'?'checked':''}/> Lock</label>
    <hr/>
  `;
  widgetSettingsPanel.appendChild(gen);

  // Position panel
  const r = widget.getBoundingClientRect();
  widgetSettingsPanel.style.top  = `${r.bottom + window.scrollY + 4}px`;
  widgetSettingsPanel.style.left = `${r.left + window.scrollX}px`;

  // Handlers
  gen.querySelector('#bringFront').onclick = () => {
    widget.style.zIndex = ++topZ;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#sendBack').onclick = () => {
    widget.style.zIndex = --bottomZ;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveForward').onclick = () => {
    widget.style.zIndex = parseInt(widget.style.zIndex||0)+1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveBackward').onclick = () => {
    widget.style.zIndex = parseInt(widget.style.zIndex||0)-1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#delWidget').onclick = () => {
    widget.remove(); saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#lockWidget').onchange = e => {
    widget.dataset.locked = e.target.checked;
    widget.style.resize = e.target.checked ? 'none' : 'both';
    saveCurrentScreen();
  };

  // Widget‐specific settings
  const type = widget.dataset.type;
  if (widgetRegistry[type].settings) {
    widgetRegistry[type].settings(widget, widgetSettingsPanel);
  }
}

// Close panel when clicking away
document.addEventListener('click', e => {
  if (!e.target.closest('#widgetSettingsPanel') &&
      !e.target.closest('.widget')) {
    widgetSettingsPanel.classList.add('hidden');
  }
});

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
  initScreens();

  // Toolbar collapse
  const collapseBtn = document.getElementById('collapseBtn'),
        tools       = document.getElementById('tools');
  collapseBtn.onclick = () => {
    const hidden = tools.style.display==='none';
    tools.style.display = hidden ? 'flex' : 'none';
    collapseBtn.innerText = hidden ? '▲' : '▼';
  };

  // Global settings panel
  const sp = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick = () => sp.classList.remove('hidden');
  document.getElementById('closeSettings').onclick = () => sp.classList.add('hidden');
  document.getElementById('themeToolbar').oninput = e =>
    document.documentElement.style.setProperty('--toolbar-bg', e.target.value);
  document.getElementById('themeWidget').oninput = e =>
    document.documentElement.style.setProperty('--widget-header-bg', e.target.value);

  // Annotation
  const annoBtn = document.getElementById('annotateTool');
  annoBtn.onclick = () => {
    annotating = !annotating;
    annoBtn.style.opacity = annotating ? '1' : '0.6';
    document.getElementById('annoControls').style.display = annotating ? 'flex' : 'none';
    initAnnotation();
    annoCanvas.style.pointerEvents = annotating ? 'auto' : 'none';
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

  // Save
  document.getElementById('saveBtn').onclick = () => {
    saveCurrentScreen();
    alert('Screen saved in memory. // TODO: push to Firebase');
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
    selectBtn.style.opacity = selecting ? '1' : '0.6';
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

  // ─ Text ─
  text: cfg => {
    const { w, cont } = createWidget('text', cfg);
    // Settings hook
    widgetRegistry.text.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Text color: <input type="color" id="txtColor" value="${w.dataset.txtColor||'#000000'}"/></label>
        <label>BG color: <input type="color" id="bgColor" value="${w.dataset.bgColor||'#ffffff'}"/></label>
        <label>Font size:
          <select id="txtSize">
            <option value="12px">12</option>
            <option value="14px" selected>14</option>
            <option value="18px">18</option>
            <option value="24px">24</option>
            <option value="32px">32</option>
          </select>
        </label>
      `;
      panel.querySelector('#txtColor').oninput = e => {
        ta.style.color = e.target.value;
        w.dataset.txtColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#bgColor').oninput = e => {
        ta.style.background = e.target.value;
        w.dataset.bgColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#txtSize').onchange = e => {
        ta.style.fontSize = e.target.value;
        w.dataset.txtSize = e.target.value; saveCurrentScreen();
      };
    };

    const ta = document.createElement('div');
    ta.contentEditable = true;
    ta.style.flex = '1';
    ta.style.padding = '4px';
    ta.style.overflow = 'auto';
    ta.innerHTML = cfg?.html || 'Click to edit…';
    cont.append(ta);
    ta.oninput = () => {
      w.dataset.html = ta.innerHTML; saveCurrentScreen();
    };
    // Apply initial styles
    if (cfg?.txtColor) ta.style.color = cfg.txtColor;
    if (cfg?.bgColor) ta.style.background = cfg.bgColor;
    if (cfg?.txtSize) ta.style.fontSize = cfg.txtSize;
    return { w, cont };
  },

  // ─ Timer ─
  timer: cfg => {
    const { w, cont } = createWidget('timer', cfg);
    // Settings hook
    widgetRegistry.timer.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Text color: <input type="color" id="tmTxt" value="${w.dataset.txtColor||'#000000'}"/></label>
        <label>BG color: <input type="color" id="tmBg" value="${w.dataset.bgColor||'#ffffff'}"/></label>
        <label>Font size:
          <select id="tmSize">
            <option value="14px">14</option>
            <option value="18px" selected>18</option>
            <option value="24px">24</option>
          </select>
        </label>
      `;
      panel.querySelector('#tmTxt').oninput = e => {
        disp.style.color = e.target.value;
        w.dataset.txtColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#tmBg').oninput = e => {
        disp.style.background = e.target.value;
        w.dataset.bgColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#tmSize').onchange = e => {
        disp.style.fontSize = e.target.value;
        w.dataset.size = e.target.value; saveCurrentScreen();
      };
    };

    // Toolbar controls
    const bar1 = document.createElement('div'); bar1.className='widget-toolbar';
    bar1.innerHTML = `
      <button id="minusMin">– Min</button>
      <button id="plusMin">+ Min</button>
      <button id="minusSec">– Sec</button>
      <button id="plusSec">+ Sec</button>
    `;
    cont.append(bar1);

    // Display
    const disp = document.createElement('div');
    disp.className = 'timer-display';
    disp.style.flex = '1';
    disp.style.fontSize = cfg?.size||'18px';
    disp.style.color = cfg?.txtColor||'#000';
    disp.style.background = cfg?.bgColor||'#fff';
    disp.style.textAlign = 'center';
    disp.style.display = 'flex';
    disp.style.alignItems = 'center';
    disp.style.justifyContent = 'center';
    cont.append(disp);

    // Controls
    const bar2 = document.createElement('div'); bar2.className='widget-toolbar';
    bar2.innerHTML = `
      <button id="startBtn">▶️</button>
      <button id="pauseBtn">⏸️</button>
      <button id="resetBtn">↺</button>
    `;
    cont.append(bar2);

    // Logic
    let total = +(w.dataset.total||cfg?.total||60);
    let intervalId = null;
    function update() {
      disp.innerText = formatTime(total);
      w.dataset.total = total;
    }
    bar1.querySelector('#plusMin').onclick = ()=>{ total+=60; update(); saveCurrentScreen(); };
    bar1.querySelector('#minusMin').onclick = ()=>{ total=Math.max(0,total-60); update(); saveCurrentScreen(); };
    bar1.querySelector('#plusSec').onclick = ()=>{ total++; update(); saveCurrentScreen(); };
    bar1.querySelector('#minusSec').onclick = ()=>{ total=Math.max(0,total-1); update(); saveCurrentScreen(); };

    bar2.querySelector('#startBtn').onclick = ()=>{
      if (intervalId) return;
      intervalId = setInterval(()=>{
        if (total>0) { total--; update(); saveCurrentScreen(); }
        else clearInterval(intervalId);
      }, 1000);
    };
    bar2.querySelector('#pauseBtn').onclick = ()=>{ clearInterval(intervalId); intervalId = null; };
    bar2.querySelector('#resetBtn').onclick = ()=>{
      clearInterval(intervalId); intervalId = null;
      total = +(cfg?.total||60);
      update(); saveCurrentScreen();
    };

    update();
    return { w, cont };
  },

  // ─ Clock ─
  clock: cfg => {
    const { w, cont } = createWidget('clock', cfg);
    widgetRegistry.clock.settings = (w, panel) => {
      panel.innerHTML += `
        <button id="toggle24">${w.dataset.format24==='true'?'24hr':'12hr'}</button>
        <label>Text color: <input type="color" id="clkColor" value="${w.dataset.color||'#000000'}"/></label>
      `;
      panel.querySelector('#toggle24').onclick = e => {
        const f24 = w.dataset.format24!=='true';
        w.dataset.format24 = f24;
        e.target.innerText = f24?'24hr':'12hr';
        saveCurrentScreen();
      };
      panel.querySelector('#clkColor').oninput = e => {
        disp.style.color = e.target.value;
        w.dataset.color = e.target.value; saveCurrentScreen();
      };
    };

    // Settings & display
    const disp = document.createElement('div');
    disp.style.flex = '1';
    disp.style.fontSize = '24px';
    disp.style.color = cfg?.color||'#000';
    disp.style.textAlign = 'center';
    cont.append(disp);

    function update() {
      const now = new Date();
      const opts = w.dataset.format24==='true'
        ? {}
        : { hour12: true };
      disp.innerText = now.toLocaleTimeString(undefined, opts);
    }
    setInterval(update, 500);
    update();
    return { w, cont };
  },

  // ─ Sound Level ─
  soundLevel: cfg => {
    const { w, cont } = createWidget('soundLevel', cfg);
    widgetRegistry.soundLevel.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Sens: <input type="range" min="0" max="1" step="0.01" id="sens" value="${w.dataset.sens||0.2}"/></label>
      `;
      panel.querySelector('#sens').oninput = e => {
        w.dataset.sens = e.target.value; saveCurrentScreen();
      };
    };

    // Meter
    const meter = document.createElement('div');
    meter.style.flex='1';
    meter.style.background='#eee';
    meter.style.height='20px';
    cont.append(meter);

    // Audio smoothing
    let sens = +(w.dataset.sens||0.2);
    navigator.mediaDevices.getUserMedia({audio:true})
      .then(stream => {
        const ac = new AudioContext();
        const src = ac.createMediaStreamSource(stream);
        const an = ac.createAnalyser();
        const data = new Uint8Array(an.fftSize);
        src.connect(an);
        function loop(){
          an.getByteTimeDomainData(data);
          let sum=0; data.forEach(v=>sum+=Math.abs(v-128));
          const vol = Math.min(1, sum/data.length/128);
          meter.style.width=(vol*100)+'%';
          meter.style.background=vol<=sens?'green':'red';
          requestAnimationFrame(loop);
        }
        loop();
      })
      .catch(err => { cont.innerText = '❌ ' + err.message; });

    return { w, cont };
  },

  // ─ Dice ─
  dice: cfg => {
    const { w, cont } = createWidget('dice', cfg);
    widgetRegistry.dice.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Sides:
          <select id="sides">
            <option value="6" ${w.dataset.sides==='6'?'selected':''}>d6</option>
            <option value="20" ${w.dataset.sides==='20'?'selected':''}>d20</option>
          </select>
        </label>
      `;
      panel.querySelector('#sides').onchange = e => {
        w.dataset.sides = e.target.value; saveCurrentScreen();
      };
    };

    const btn = document.createElement('button');
    btn.innerText = 'Roll 🎲';
    const disp = document.createElement('div'); disp.style.flex='1'; disp.style.fontSize='2rem'; disp.style.textAlign='center';
    cont.append(btn, disp);

    btn.onclick = () => {
      const s = +(w.dataset.sides||cfg?.sides||6);
      disp.innerText = Math.floor(Math.random()*s)+1;
    };

    return { w, cont };
  },

  // ─ Scoreboard ─
  scoreboard: cfg => {
    const { w, cont } = createWidget('scoreboard', cfg);
    widgetRegistry.scoreboard.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Teams:
          <input type="number" id="teamCnt" min="2" max="8" value="${w.dataset.count||2}"/>
        </label>
      `;
      panel.querySelector('#teamCnt').oninput = e => {
        w.dataset.count = e.target.value;
        renderTeams(); saveCurrentScreen();
      };
    };

    const box = document.createElement('div');
    box.style.flex='1'; box.style.overflow='auto';
    cont.append(box);

    function renderTeams(){
      box.innerHTML='';
      const cnt = +(w.dataset.count||2);
      for (let i=1;i<=cnt;i++){
        const row = document.createElement('div');
        row.style.display='flex'; row.style.alignItems='center'; row.style.margin='4px';
        const lbl = document.createElement('span');
        lbl.innerText = `Team ${i}: `;
        const disp = document.createElement('span');
        disp.innerText = '0'; disp.style.margin='0 8px';
        let sc = 0;
        const plus = document.createElement('button'); plus.innerText='+';
        const minus= document.createElement('button'); minus.innerText='-';
        plus.onclick = ()=>{ sc++; disp.innerText=sc; saveCurrentScreen(); };
        minus.onclick=()=>{ sc--; disp.innerText=sc; saveCurrentScreen(); };
        row.append(lbl, minus, disp, plus);
        box.append(row);
      }
    }

    renderTeams();
    return { w, cont };
  },

  // ─ Visual Timer ─
  visualTimer: cfg => {
    const { w, cont } = createWidget('visualTimer', cfg);
    widgetRegistry.visualTimer.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Total:
          <input type="number" id="vtTot" min="1" value="${w.dataset.total||60}"/>
        </label>
      `;
      panel.querySelector('#vtTot').oninput = e => {
        w.dataset.total = e.target.value;
        resetTimer(); saveCurrentScreen();
      };
    };

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 120;
    cont.append(canvas);
    const ctx = canvas.getContext('2d');

    let total = +(w.dataset.total||cfg?.total||60);
    let rem   = total;
    let id;

    function draw(){
      ctx.clearRect(0,0,120,120);
      const pct = rem/total;
      ctx.beginPath();
      ctx.arc(60,60,54,-Math.PI/2,-Math.PI/2+2*Math.PI*pct);
      ctx.lineWidth=10; ctx.stroke();
      ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(formatTime(rem),60,60);
      w.dataset.total=total; w.dataset.remaining=rem;
    }

    function resetTimer(){
      clearInterval(id);
      total = +(w.dataset.total);
      rem = total;
      draw();
    }

    // Start automatically
    draw();
    id = setInterval(()=>{
      if (rem>0){ rem--; draw(); saveCurrentScreen(); }
      else clearInterval(id);
    },1000);

    return { w, cont };
  },

  // ─ Draw ─
  draw: cfg => {
    const { w, cont } = createWidget('draw', cfg);
    widgetRegistry.draw.settings = (w,panel) => {
      panel.innerHTML += `
        <button id="clearDraw">Clear</button>
        <select id="pattern">
          <option value="blank">Blank</option>
          <option value="lined">Lined</option>
          <option value="grid">Grid</option>
        </select>
      `;
      panel.querySelector('#clearDraw').onclick = () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        saveCurrentScreen();
      };
      panel.querySelector('#pattern').onchange = e => {
        w.dataset.pattern = e.target.value;
        // TODO: apply pattern
        saveCurrentScreen();
      };
    };

    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = `
      <button id="drawPen">✏️</button>
      <button id="drawEraser">🧹</button>
      <input type="color" id="drawColor" value="${w.dataset.color||'#000000'}"/>
      <input type="range" id="drawSize" min="1" max="20" value="${w.dataset.size||4}"/>
    `;
    cont.append(bar);

    const canvas = document.createElement('canvas');
    canvas.width = cont.clientWidth; canvas.height = cont.clientHeight - bar.offsetHeight;
    cont.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    let drawing=false;

    function setMode(m){
      ctx.globalCompositeOperation = m==='erase'?'destination-out':'source-over';
    }
    bar.querySelector('#drawPen').onclick    = () => setMode('pen');
    bar.querySelector('#drawEraser').onclick = () => setMode('erase');
    bar.querySelector('#drawColor').oninput   = e => { ctx.strokeStyle = e.target.value; w.dataset.color=e.target.value; saveCurrentScreen(); };
    bar.querySelector('#drawSize').oninput    = e => { ctx.lineWidth = e.target.value; w.dataset.size=e.target.value; saveCurrentScreen(); };

    canvas.onmousedown = e => {
      drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY);
    };
    canvas.onmousemove = e => {
      if (!drawing) return; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke();
    };
    document.onmouseup = () => {
      if (drawing) { drawing=false; saveCurrentScreen(); }
    };

    // Init
    setMode('pen');
    ctx.strokeStyle = w.dataset.color || '#000';
    ctx.lineWidth   = w.dataset.size  || 4;

    return { w, cont };
  },

  // ─ Calendar ─
  calendar: cfg => {
    const { w, cont } = createWidget('calendar', cfg);
    widgetRegistry.calendar.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Start day:
          <select id="startDay">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
          </select>
        </label>
        <label><input type="checkbox" id="showWeekends" ${w.dataset.showWeekends!=='false'?'checked':''}/> Show weekends</label>
      `;
      panel.querySelector('#startDay').onchange = e => {
        w.dataset.startDay = e.target.value; render(); saveCurrentScreen();
      };
      panel.querySelector('#showWeekends').onchange = e => {
        w.dataset.showWeekends = e.target.checked; render(); saveCurrentScreen();
      };
    };

    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = `<button id="prev">‹</button><span id="title"></span><button id="next">›</button>`;
    cont.append(bar);
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(7,1fr)';
    grid.style.flex='1';
    grid.style.gap='2px';
    cont.append(grid);

    let date = cfg?.date ? new Date(cfg.date) : new Date();
    w.dataset.date = date.toISOString();

    function render(){
      grid.innerHTML = '';
      const sd = +(w.dataset.startDay||0);
      const showWd = w.dataset.showWeekends!=='false';
      document.getElementById('title').innerText =
        date.toLocaleString('default',{month:'long',year:'numeric'});
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((d,i)=>{
        if (!showWd && (i===0||i===6)) return;
        const hd=document.createElement('div'); hd.style.fontWeight='bold';
        hd.innerText = d; grid.append(hd);
      });
      const firstDay = new Date(date.getFullYear(),date.getMonth(),1).getDay();
      const days = new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
      for (let i=0;i<firstDay;i++){
        const blank=document.createElement('div');
        if (!showWd && (i===0||i===6)) continue;
        grid.append(blank);
      }
      for (let d=1; d<=days; d++){
        const cell=document.createElement('div');
        cell.innerText=d;
        cell.style.cursor='pointer';
        cell.onclick=()=>{ w.dataset.selected=d; saveCurrentScreen(); };
        grid.append(cell);
      }
    }

    bar.querySelector('#prev').onclick = ()=>{ date.setMonth(date.getMonth()-1); render(); };
    bar.querySelector('#next').onclick = ()=>{ date.setMonth(date.getMonth()+1); render(); };

    render();
    return { w, cont };
  },

  // ─ Screen Share ─
  screenShare: cfg => {
    const { w, cont } = createWidget('screenShare', cfg);
    widgetRegistry.screenShare.settings = () => {}; // no extras
    navigator.mediaDevices.getDisplayMedia({video:true})
      .then(stream => {
        const vid = document.createElement('video');
        vid.srcObject = stream; vid.autoplay = true;
        vid.style.flex='1'; vid.style.objectFit='contain';
        cont.append(vid);
      })
      .catch(err => cont.innerText = '❌ '+err.message);
    return { w, cont };
  },

  // ─ Placeholders for others ─
  poll:           cfg => createWidget('poll',cfg),
  timetable:      cfg => createWidget('timetable',cfg),
  randomizer:     cfg => createWidget('randomizer',cfg),
  groupMaker:     cfg => createWidget('groupMaker',cfg),
  stickers:       cfg => createWidget('stickers',cfg),
  image:          cfg => createWidget('image',cfg),
  video:          cfg => createWidget('video',cfg),
  embed:          cfg => createWidget('embed',cfg),
  hyperlink:      cfg => createWidget('hyperlink',cfg),
  qrCode:         cfg => createWidget('qrCode',cfg),
  stopwatch:      cfg => createWidget('stopwatch',cfg),
  webcam:         cfg => createWidget('webcam',cfg)
};
