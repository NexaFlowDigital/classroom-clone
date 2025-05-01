// ─── In-Memory Screens ───
let screens = { 'Screen 1': [] };
let activeScreen = 'Screen 1';
let topZ = 1000, bottomZ = 0;

// ─── Widget ResizeObserver (for draw, etc.) ───
const widgetResizeObserver = new ResizeObserver(entries => {
  for (let { target } of entries) {
    if (target.dataset.type === 'draw') {
      const canvas = target.querySelector('canvas');
      const bar    = target.querySelector('.widget-toolbar');
      if (!canvas || !bar) continue;
      // compute available area
      const rect = canvas.parentElement.getBoundingClientRect();
      const h    = rect.height - bar.getBoundingClientRect().height;
      const w    = rect.width;
      canvas.width  = w;
      canvas.height = h;
    }
  }
});

// ─── Drag & Resize Utility ───
function makeDraggable(el) {
  let dx, dy, dragging = false;
  el.addEventListener('mousedown', e => {
    // don't start drag if clicking the gear icon
    if (e.target.classList.contains('widget-settings-icon')) return;
    if (el.dataset.locked === 'true') return;
    // only start when clicking inside widget, not on resize handle
    dragging = true;
    dx = e.clientX - el.offsetLeft;
    dy = e.clientY - el.offsetTop;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = (e.clientX - dx) + 'px';
    el.style.top  = (e.clientY - dy) + 'px';
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

  // restore saved position/size or set defaults
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
  w.style.resize = w.dataset.locked==='true'?'none':'both';

  // content container
  const cont = document.createElement('div');
  cont.className = 'content';
  w.appendChild(cont);

  // clickable gear icon
  const icon = document.createElement('div');
  icon.className = 'widget-settings-icon';
  icon.innerText = '⚙️';
  w.appendChild(icon);

  // attach to canvas
  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);
  widgetResizeObserver.observe(w);

  // gear opens settings
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
  for (let name of Object.keys(screens)) {
    const btn = document.createElement('button');
    btn.className = 'screenTab' + (name===activeScreen?' active':'');
    btn.innerText = name;
    btn.onclick = () => switchScreen(name);
    tabs.appendChild(btn);
  }
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
  for (let w of document.querySelectorAll('.widget')) {
    const s = getComputedStyle(w);
    arr.push({
      type: w.dataset.type,
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
      z: w.style.zIndex,
      html: w.querySelector('.content').innerHTML,
      locked: w.dataset.locked
    });
  }
  screens[activeScreen] = arr;
  persistScreens();
}
function clearCanvas() {
  document.getElementById('canvas').innerHTML = '';
}
function loadScreen(name) {
  clearCanvas();
  for (let cfg of screens[name]||[]) {
    const { w, cont } = widgetRegistry[cfg.type](cfg);
    cont.innerHTML = cfg.html;
    w.dataset.locked = cfg.locked;
    w.style.resize = cfg.locked==='true'?'none':'both';
  }
  activeScreen = name;
  persistScreens();
  for (let b of document.querySelectorAll('.screenTab'))
    b.classList.toggle('active', b.innerText===name);
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
    annoCtx.moveTo(e.offsetX,e.offsetY);
    annoCanvas.onmousemove = ev => {
      annoCtx.lineTo(ev.offsetX,ev.offsetY);
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

  // Collapse toolbar
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

  // Save screen
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
// … (includes all your widgets, unchanged) …

// ─── Widget Registry ───
const widgetRegistry = {
  // ─ Text ─
  text: cfg => {
    const { w, cont } = createWidget('text', cfg);
    widgetRegistry.text.settings = (w,panel) => {
      const div = cont.querySelector('div');
      panel.innerHTML += `
        <label>Text color: <input type="color" id="txtColor" value="${w.dataset.txtColor||'#000'}"/></label>
        <label>BG color: <input type="color" id="bgColor" value="${w.dataset.bgColor||'#fff'}"/></label>
        <label>Font size:
          <select id="txtSize">
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="18px">18</option>
            <option value="24px">24</option>
          </select>
        </label>
      `;
      panel.querySelector('#txtColor').oninput = e => {
        div.style.color = e.target.value;
        w.dataset.txtColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#bgColor').oninput = e => {
        div.style.background = e.target.value;
        w.dataset.bgColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#txtSize').onchange = e => {
        div.style.fontSize = e.target.value;
        w.dataset.txtSize = e.target.value; saveCurrentScreen();
      };
    };
    const div = document.createElement('div');
    div.contentEditable = true;
    div.style.flex = '1';
    div.style.padding = '4px';
    div.style.overflow = 'auto';
    div.style.fontSize = cfg?.txtSize||'14px';
    div.style.color    = cfg?.txtColor||'#000';
    div.style.background = cfg?.bgColor||'#fff';
    div.innerHTML = cfg?.html || 'Click to edit…';
    cont.append(div);
    div.oninput = () => {
      w.dataset.html = div.innerHTML; saveCurrentScreen();
    };
    return { w, cont };
  },

  // ─ Timer ─
  timer: cfg => {
    const { w, cont } = createWidget('timer', cfg);
    widgetRegistry.timer.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Text color: <input type="color" id="tmTxt" value="${w.dataset.txtColor||'#000'}"/></label>
        <label>BG color: <input type="color" id="tmBg" value="${w.dataset.bgColor||'#fff'}"/></label>
        <label>Font size:
          <select id="tmSize">
            <option value="14px">14</option>
            <option value="18px">18</option>
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
    const bar1 = document.createElement('div'); bar1.className='widget-toolbar';
    bar1.innerHTML = `
      <button id="minusMin">– Min</button>
      <button id="plusMin">+ Min</button>
      <button id="minusSec">– Sec</button>
      <button id="plusSec">+ Sec</button>
    `;
    cont.append(bar1);
    const disp = document.createElement('div');
    disp.className='timer-display';
    disp.style.flex='1';
    disp.style.textAlign='center';
    disp.style.display='flex';
    disp.style.alignItems='center';
    disp.style.justifyContent='center';
    disp.style.fontSize = cfg?.size||'18px';
    disp.style.color    = cfg?.txtColor||'#000';
    disp.style.background = cfg?.bgColor||'#fff';
    cont.append(disp);
    const bar2 = document.createElement('div'); bar2.className='widget-toolbar';
    bar2.innerHTML = `
      <button id="startBtn">▶️</button>
      <button id="pauseBtn">⏸️</button>
      <button id="resetBtn">↺</button>
    `;
    cont.append(bar2);
    let total = +(w.dataset.total||cfg?.total||60), id=null;
    function update() {
      disp.innerText = formatTime(total);
      w.dataset.total = total;
    }
    bar1.querySelector('#plusMin').onclick  = ()=>{ total+=60; update(); saveCurrentScreen(); };
    bar1.querySelector('#minusMin').onclick = ()=>{ total=Math.max(0,total-60); update(); saveCurrentScreen(); };
    bar1.querySelector('#plusSec').onclick  = ()=>{ total++; update(); saveCurrentScreen(); };
    bar1.querySelector('#minusSec').onclick = ()=>{ total=Math.max(0,total-1); update(); saveCurrentScreen(); };
    bar2.querySelector('#startBtn').onclick = ()=>{ if(id) return; id=setInterval(()=>{
      if(total>0){ total--; update(); saveCurrentScreen(); } else clearInterval(id);
    },1000); };
    bar2.querySelector('#pauseBtn').onclick = ()=>{ clearInterval(id); id=null; };
    bar2.querySelector('#resetBtn').onclick = ()=>{ clearInterval(id); id=null; total=+(cfg?.total||60); update(); saveCurrentScreen(); };
    update();
    return { w, cont };
  },

  // ─ Clock ─
  clock: cfg => {
    const { w, cont } = createWidget('clock', cfg);
    widgetRegistry.clock.settings = (w,panel) => {
      panel.innerHTML += `
        <button id="toggle24">${w.dataset.format24==='true'?'24hr':'12hr'}</button>
        <label>Text color: <input type="color" id="clkColor" value="${w.dataset.color||'#000'}"/></label>
      `;
      panel.querySelector('#toggle24').onclick = e => {
        const f24 = w.dataset.format24!=='true';
        w.dataset.format24 = f24; e.target.innerText = f24?'24hr':'12hr'; saveCurrentScreen();
      };
      panel.querySelector('#clkColor').oninput = e => {
        disp.style.color = e.target.value;
        w.dataset.color = e.target.value; saveCurrentScreen();
      };
    };
    const disp = document.createElement('div');
    disp.style.flex='1'; disp.style.fontSize='24px'; disp.style.textAlign='center';
    disp.style.color = cfg?.color||'#000';
    cont.append(disp);
    function update(){
      const now = new Date();
      const opts = w.dataset.format24==='true'?{}:{hour12:true};
      disp.innerText = now.toLocaleTimeString(undefined,opts);
    }
    setInterval(update,500);
    update();
    return { w, cont };
  },

  // ─ Sound Level ─
  soundLevel: cfg => {
    const { w, cont } = createWidget('soundLevel', cfg);
    widgetRegistry.soundLevel.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Sens: <input type="range" id="sens" min="0" max="1" step="0.01" value="${w.dataset.sens||0.2}"/></label>
      `;
      panel.querySelector('#sens').oninput = e => {
        w.dataset.sens = e.target.value; saveCurrentScreen();
      };
    };
    const meter = document.createElement('div');
    meter.style.flex='1'; meter.style.background='#eee'; meter.style.height='20px';
    cont.append(meter);
    let sens=+(w.dataset.sens||0.2);
    navigator.mediaDevices.getUserMedia({audio:true})
      .then(stream=>{
        const ac=new AudioContext(), src=ac.createMediaStreamSource(stream),
              an=ac.createAnalyser(), data=new Uint8Array(an.fftSize);
        src.connect(an);
        function loop(){
          an.getByteTimeDomainData(data);
          let sum=0; data.forEach(v=>sum+=Math.abs(v-128));
          const vol=Math.min(1,sum/data.length/128);
          meter.style.width=(vol*100)+'%';
          meter.style.background=vol<=sens?'green':'red';
          requestAnimationFrame(loop);
        }
        loop();
      })
      .catch(err=>cont.innerText='❌ '+err.message);
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
    const btn = document.createElement('button'); btn.innerText='Roll 🎲';
    const disp = document.createElement('div');
    disp.style.flex='1'; disp.style.fontSize='2rem'; disp.style.textAlign='center';
    cont.append(btn,disp);
    btn.onclick = () => {
      const s = +(w.dataset.sides||6);
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
        w.dataset.count = e.target.value; renderTeams(); saveCurrentScreen();
      };
    };
    const box = document.createElement('div');
    box.style.flex='1'; box.style.overflow='auto';
    cont.append(box);
    function renderTeams(){
      box.innerHTML='';
      const cnt = +(w.dataset.count||2);
      for(let i=1;i<=cnt;i++){
        let sc=0;
        const row=document.createElement('div');
        row.style.display='flex'; row.style.alignItems='center'; row.style.margin='4px';
        const lbl=document.createElement('span'); lbl.innerText=`Team ${i}: `;
        const disp=document.createElement('span'); disp.innerText=sc; disp.style.margin='0 8px';
        const plus=document.createElement('button'); plus.innerText='+';
        const minus=document.createElement('button'); minus.innerText='-';
        plus.onclick=()=>{ sc++; disp.innerText=sc; saveCurrentScreen(); };
        minus.onclick=()=>{ sc--; disp.innerText=sc; saveCurrentScreen(); };
        row.append(lbl,minus,disp,plus);
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
        w.dataset.total = e.target.value; resetTimer(); saveCurrentScreen();
      };
    };
    const canvas = document.createElement('canvas');
    canvas.width=canvas.height=120;
    cont.append(canvas);
    const ctx=canvas.getContext('2d');
    let total=+(w.dataset.total||60), rem=total, id;
    function draw(){
      ctx.clearRect(0,0,120,120);
      const pct = rem/total;
      ctx.beginPath();
      ctx.arc(60,60,54,-Math.PI/2, -Math.PI/2 + 2*Math.PI*pct);
      ctx.lineWidth=10; ctx.stroke();
      ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(formatTime(rem),60,60);
      w.dataset.total=total; w.dataset.remaining=rem;
    }
    function resetTimer(){
      clearInterval(id);
      total=+(w.dataset.total); rem=total;
      draw();
    }
    draw();
    id = setInterval(()=>{
      if(rem>0){ rem--; draw(); saveCurrentScreen(); }
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
        ctx.clearRect(0,0,canvas.width,canvas.height); saveCurrentScreen();
      };
      panel.querySelector('#pattern').onchange = e => {
        w.dataset.pattern = e.target.value;
        // TODO: apply pattern
        saveCurrentScreen();
      };
    };
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="drawPen">✏️</button>
      <button id="drawEraser">🧹</button>
      <input type="color" id="drawColor" value="${w.dataset.color||'#000'}"/>
      <input type="range" id="drawSize" min="1" max="20" value="${w.dataset.size||4}"/>
    `;
    cont.append(bar);
    const canvas = document.createElement('canvas');
    canvas.width = cont.clientWidth;
    canvas.height = cont.clientHeight - bar.offsetHeight;
    cont.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.lineCap='round';
    let drawing=false;
    function setMode(m){
      ctx.globalCompositeOperation = m==='erase'?'destination-out':'source-over';
    }
    bar.querySelector('#drawPen').onclick    = ()=>setMode('pen');
    bar.querySelector('#drawEraser').onclick = ()=>setMode('erase');
    bar.querySelector('#drawColor').oninput   = e=>{ctx.strokeStyle=e.target.value;w.dataset.color=e.target.value;saveCurrentScreen()};
    bar.querySelector('#drawSize').oninput    = e=>{ctx.lineWidth=e.target.value;w.dataset.size=e.target.value;saveCurrentScreen()};
    canvas.onmousedown = e=>{drawing=true;ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY)};
    canvas.onmousemove = e=>{ if(!drawing) return; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke() };
    document.onmouseup = ()=>{ if(drawing){drawing=false;saveCurrentScreen()} };
    setMode('pen'); ctx.strokeStyle=w.dataset.color||'#000'; ctx.lineWidth=w.dataset.size||4;
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
        <label><input type="checkbox" id="showWeekends" checked/> Show weekends</label>
      `;
      panel.querySelector('#startDay').onchange = e=>{w.dataset.startDay=e.target.value;render();saveCurrentScreen()};
      panel.querySelector('#showWeekends').onchange = e=>{w.dataset.showWeekends=e.target.checked;render();saveCurrentScreen()};
    };
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = `<button id="prev">‹</button><span id="title"></span><button id="next">›</button>`;
    cont.append(bar);
    const grid = document.createElement('div');
    grid.style.display='grid';
    grid.style.gridTemplateColumns='repeat(7,1fr)';
    grid.style.flex='1';
    grid.style.gap='2px';
    cont.append(grid);
    let date = cfg?.date ? new Date(cfg.date) : new Date();
    w.dataset.date = date.toISOString();
    function render(){
      grid.innerHTML = '';
      const showWd = w.dataset.showWeekends!=='false';
      document.getElementById('title').innerText =
        date.toLocaleString('default',{month:'long',year:'numeric'});
      ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((d,i)=>{
        if(!showWd&&(i===0||i===6)) return;
        const hd=document.createElement('div');
        hd.style.fontWeight='bold';
        hd.innerText=d;
        grid.append(hd);
      });
      const fd=new Date(date.getFullYear(),date.getMonth(),1).getDay();
      for(let i=0;i<fd;i++) {
        if(showWd||(i>0&&i<6)) grid.append(document.createElement('div'));
      }
      const days=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
      for(let d=1;d<=days;d++){
        const cell=document.createElement('div');
        cell.innerText=d;
        cell.style.cursor='pointer';
        cell.onclick=()=>{w.dataset.selected=d;saveCurrentScreen()};
        grid.append(cell);
      }
    }
    bar.querySelector('#prev').onclick = ()=>{date.setMonth(date.getMonth()-1);render()};
    bar.querySelector('#next').onclick = ()=>{date.setMonth(date.getMonth()+1);render()};
    render();
    return { w, cont };
  },

  // ─ Screen Share ─
  screenShare: cfg => {
    const { w, cont } = createWidget('screenShare', cfg);
    widgetRegistry.screenShare.settings = () => {};
    navigator.mediaDevices.getDisplayMedia({video:true})
      .then(s=>{
        const v=document.createElement('video');
        v.srcObject=s; v.autoplay=true; v.style.flex='1'; v.style.objectFit='contain';
        cont.append(v);
      })
      .catch(err=>cont.innerText='❌ '+err.message);
    return { w, cont };
  },

  // ─ Poll ─
  poll: cfg => {
    const { w, cont } = createWidget('poll', cfg);
    widgetRegistry.poll.settings = (w,panel) => {
      panel.innerHTML += `<button id="resetPoll">Reset</button>`;
      panel.querySelector('#resetPoll').onclick = ()=>{counts.fill(0); update(); saveCurrentScreen()};
    };
    const q    = cfg?.q    || prompt('Question:') || 'Question?';
    const opts = cfg?.opts ? cfg.opts.split(',') : (prompt('Options, comma:','Yes,No')||'Yes,No').split(',');
    let counts = cfg?.counts ? cfg.counts.split(',').map(Number) : opts.map(_=>0);
    w.dataset.q = q;
    w.dataset.opts = opts.join(',');
    w.dataset.counts = counts.join(',');
    cont.innerHTML = `<strong>${q}</strong><br>`;
    function update() {
      cont.innerHTML = `<strong>${q}</strong><br>`;
      opts.forEach((o,i)=>{
        const btn = document.createElement('button');
        btn.innerText = `${o.trim()} (${counts[i]})`;
        btn.onclick = ()=>{counts[i]++; w.dataset.counts=counts.join(','); update(); saveCurrentScreen()};
        cont.append(btn, document.createElement('br'));
      });
    }
    update();
    return { w, cont };
  },

  // ─ Timetable ─
  timetable: cfg => {
    const { w, cont } = createWidget('timetable', cfg);
    widgetRegistry.timetable.settings = (w,panel) => {
      panel.innerHTML += `<button id="toggleMode">Toggle Mode</button>`;
      // TODO: implement checklist vs timed
    };
    const list = document.createElement('div');
    list.style.flex='1'; list.style.overflow='auto';
    list.innerHTML = cfg?.html || '<div>08:00 – <span contentEditable>Activity</span></div>';
    cont.append(list);
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = `<button id="addAct">+ Activity</button>`;
    cont.insertBefore(bar, list);
    bar.querySelector('#addAct').onclick = ()=>{
      const t = prompt('Time:'), a = prompt('Activity:');
      if (t && a) {
        const row = document.createElement('div');
        row.innerHTML = `${t} – <span contentEditable>${a}</span>`;
        list.append(row);
        w.dataset.html = list.innerHTML;
        saveCurrentScreen();
      }
    };
    return { w, cont };
  },

  // ─ Randomizer ─
  randomizer: cfg => {
    const { w, cont } = createWidget('randomizer', cfg);
    widgetRegistry.randomizer.settings = () => {};
    const items = cfg?.items ? cfg.items.split(',') : (prompt('Items, comma:','A,B,C')||'A,B,C').split(',');
    w.dataset.items = items.join(',');
    const btn = document.createElement('button'); btn.innerText='Shuffle';
    const disp= document.createElement('div'); disp.style.flex='1'; disp.style.textAlign='center';
    cont.append(btn, disp);
    btn.onclick = ()=> disp.innerText = items[Math.floor(Math.random()*items.length)];
    return { w, cont };
  },

  // ─ Group Maker ─
  groupMaker: cfg => {
    const { w, cont } = createWidget('groupMaker', cfg);
    widgetRegistry.groupMaker.settings = () => {};
    const names = cfg?.names ? cfg.names.split(',') : (prompt('Names, comma:','A,B,C')||'A,B,C').split(',');
    const size  = +cfg?.size || parseInt(prompt('Group size:'),10) || 2;
    w.dataset.names = names.join(',');
    w.dataset.size  = size;
    const btn = document.createElement('button'); btn.innerText='Make groups';
    const disp= document.createElement('div'); disp.style.flex='1';
    cont.append(btn, disp);
    btn.onclick = ()=>{
      const arr = [...names], out=[];
      while(arr.length) out.push(arr.splice(0,size));
      disp.innerHTML = out.map(g=>g.join(', ')).join('<br>');
      saveCurrentScreen();
    };
    return { w, cont };
  },

  // ─ Work Symbols ─
  workSymbols: cfg => {
    const { w, cont } = createWidget('workSymbols', cfg);
    widgetRegistry.workSymbols.settings = () => {};
    const syms = ['✏️','☕️','✅','🔴'];
    let idx = +w.dataset.idx||0;
    const btn = document.createElement('button'); btn.innerText='Next';
    const disp= document.createElement('div');
    disp.style.flex='1'; disp.style.fontSize='2rem'; disp.style.textAlign='center';
    cont.append(disp, btn);
    btn.onclick = ()=>{
      idx = (idx+1)%syms.length;
      disp.innerText = syms[idx];
      w.dataset.idx = idx;
      saveCurrentScreen();
    };
    disp.innerText = syms[idx];
    return { w, cont };
  },

  // ─ Stickers ─
  stickers: cfg => {
    const { w, cont } = createWidget('stickers', cfg);
    widgetRegistry.stickers.settings = () => {};
    const gallery = document.createElement('div');
    gallery.style.flex='1'; gallery.style.display='flex'; gallery.style.flexWrap='wrap';
    cont.append(gallery);
    const btn = document.createElement('button'); btn.innerText='+Sticker';
    cont.insertBefore(btn, gallery);
    btn.onclick = ()=>{
      const url = prompt('Sticker URL:');
      if (url) {
        const img = document.createElement('img');
        img.src=url; img.style.width='50px'; img.style.height='50px'; img.style.cursor='move';
        gallery.append(img);
        w.dataset.html = gallery.innerHTML;
        saveCurrentScreen();
        makeDraggable(img);
      }
    };
    return { w, cont };
  },

  // ─ Image ─
  image: cfg => {
    const { w, cont } = createWidget('image', cfg);
    const url = cfg?.url || prompt('Image URL:');
    if (url) {
      const img = document.createElement('img');
      img.src=url; img.style.flex='1'; img.style.objectFit='contain';
      cont.append(img);
      w.dataset.url=url; saveCurrentScreen();
    }
    widgetRegistry.image.settings = () => {};
    return { w, cont };
  },

  // ─ Video ─
  video: cfg => {
    const { w, cont } = createWidget('video', cfg);
    const url = cfg?.url || prompt('YouTube URL/ID:');
    if (url) {
      const id = url.includes('v=') ? url.split('v=')[1] : url;
      const ifr = document.createElement('iframe');
      ifr.src=`https://www.youtube.com/embed/${id}`;
      ifr.allowFullscreen=true; ifr.style.flex='1'; ifr.style.border='none';
      cont.append(ifr);
      w.dataset.url=url; saveCurrentScreen();
    }
    widgetRegistry.video.settings = () => {};
    return { w, cont };
  },

  // ─ Embed ─
  embed: cfg => {
    const { w, cont } = createWidget('embed', cfg);
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = '<button id="editEmbed">Edit</button>';
    cont.append(bar);
    const ifr = document.createElement('iframe');
    ifr.style.flex='1'; ifr.style.border='none';
    cont.append(ifr);
    function setURL(u) {
      if (u.includes('docs.google.com/presentation')) {
        u = u.replace('/edit','/embed').split('&')[0];
      }
      ifr.src=u;
      w.dataset.url=u;
      saveCurrentScreen();
    }
    if (cfg?.url) setURL(cfg.url);
    bar.querySelector('#editEmbed').onclick = ()=>{
      const u = prompt('Embed URL:', w.dataset.url||'');
      if (u) setURL(u);
    };
    widgetRegistry.embed.settings = () => {};
    return { w, cont };
  },

  // ─ Hyperlink ─
  hyperlink: cfg => {
    const { w, cont } = createWidget('hyperlink', cfg);
    const links = cfg?.links ? JSON.parse(cfg.links) : [];
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = '<button id="addLink">+ Link</button>';
    cont.append(bar);
    const list = document.createElement('div'); list.style.flex='1'; cont.append(list);
    function render() {
      list.innerHTML='';
      links.forEach((ln,i)=>{
        const row = document.createElement('div');
        row.innerHTML = `<a href="${ln.url}" target="_blank">${ln.text}</a>
          <button data-del="${i}">✖</button>`;
        row.querySelector('button').onclick = ()=>{
          links.splice(i,1);
          render();
          w.dataset.links=JSON.stringify(links);
          saveCurrentScreen();
        };
        list.append(row);
      });
    }
    bar.querySelector('#addLink').onclick = ()=>{
      const url = prompt('URL:'), txt = prompt('Text:')||url;
      if (url) {
        links.push({url, text:txt});
        render();
        w.dataset.links=JSON.stringify(links);
        saveCurrentScreen();
      }
    };
    render();
    widgetRegistry.hyperlink.settings = () => {};
    return { w, cont };
  },

  // ─ QR Code ─
  qrCode: cfg => {
    const { w, cont } = createWidget('qrCode', cfg);
    const data = cfg?.data || prompt('Text/URL:');
    if (data) {
      const img = document.createElement('img');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=150x150`;
      img.style.flex='1';
      cont.append(img);
      w.dataset.data=data; saveCurrentScreen();
    }
    widgetRegistry.qrCode.settings = () => {};
    return { w, cont };
  },

  // ─ Stopwatch ─
  stopwatch: cfg => {
    const { w, cont } = createWidget('stopwatch', cfg);
    let running=false, start=0, elapsed=+(cfg?.elapsed||0), interval;
    const disp=document.createElement('div');
    disp.style.flex='1'; disp.style.textAlign='center'; disp.style.fontSize='2rem';
    cont.append(disp);
    const bar=document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML=`
      <button id="swStart">▶️</button>
      <button id="swStop">⏸️</button>
      <button id="swLap">🏁</button>
    `;
    cont.append(bar);
    const laps=document.createElement('div');
    laps.style.flex='1'; laps.style.overflow='auto';
    cont.append(laps);
    function update(){
      const ms = running ? (Date.now()-start+elapsed) : elapsed;
      disp.innerText = formatTime(Math.floor(ms/1000));
    }
    bar.querySelector('#swStart').onclick=()=>{
      if (!running) {
        running=true;
        start = Date.now();
        interval = setInterval(update,500);
      }
    };
    bar.querySelector('#swStop').onclick=()=>{
      if (running) {
        running=false;
        clearInterval(interval);
        elapsed += Date.now()-start;
        saveCurrentScreen();
      }
    };
    bar.querySelector('#swLap').onclick=()=>{
      const lap = document.createElement('div');
      lap.innerText = disp.innerText;
      laps.append(lap);
    };
    update();
    widgetRegistry.stopwatch.settings = () => {};
    return { w, cont };
  },

  // ─ Webcam ─
  webcam: cfg => {
    const { w, cont } = createWidget('webcam', cfg);
    widgetRegistry.webcam.settings = () => {};
    const bar = document.createElement('div'); bar.className='widget-toolbar';
    bar.innerHTML = `<button id="flip">Flip</button><button id="rotate">Rotate</button>`;
    cont.append(bar);
    const video = document.createElement('video');
    video.autoplay=true; video.style.flex='1'; video.style.objectFit='cover';
    cont.append(video);
    navigator.mediaDevices.getUserMedia({video:true})
      .then(s=>{ video.srcObject=s; })
      .catch(err=>cont.innerText='❌ '+err.message);
    let flipped=false, rotated=false;
    function apply(){
      let t = '';
      if (flipped)  t += 'scaleX(-1) ';
      if (rotated) t += 'rotate(90deg)';
      video.style.transform = t;
      w.dataset.flipped=flipped; w.dataset.rotated=rotated;
      saveCurrentScreen();
    }
    bar.querySelector('#flip').onclick   = ()=>{ flipped=!flipped;  apply(); };
    bar.querySelector('#rotate').onclick = ()=>{ rotated=!rotated; apply(); };
    return { w, cont };
  },

  // ─ Traffic Light ─
  trafficLight: cfg => {
    const { w, cont } = createWidget('trafficLight', cfg);
    widgetRegistry.trafficLight.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Design:
          <select id="design">
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
          </select>
        </label>
        <label>Label: <input id="desc" value="${w.dataset.desc||''}"/></label>
      `;
      panel.querySelector('#design').onchange = e => {
        w.dataset.design = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#desc').oninput = e => {
        w.dataset.desc = e.target.value; saveCurrentScreen();
      };
    };
    const box = document.createElement('div');
    box.className = 'traffic-box';
    cont.append(box);

    const states = ['red','yellow','green'];
    let idx = states.indexOf(cfg?.state) >=0 ? states.indexOf(cfg.state) : 0;
    function render() {
      box.innerHTML = '';
      states.forEach((c,i)=>{
        const dot = document.createElement('div');
        dot.className = 'traffic-light-circle';
        dot.style.background = i===idx?c:'#444';
        box.append(dot);
      });
      if (w.dataset.desc) {
        const lbl=document.createElement('div');
        lbl.style.marginTop='4px';
        lbl.style.fontSize='0.9em';
        lbl.innerText = w.dataset.desc;
        box.append(lbl);
      }
      w.dataset.state = states[idx];
    }
    box.onclick = ()=>{
      idx = (idx+1)%states.length;
      render();
      saveCurrentScreen();
    };
    render();
    return { w, cont };
  },

  // ─ Event Countdown ─
  eventCountdown: cfg => {
    const { w, cont } = createWidget('eventCountdown', cfg);
    widgetRegistry.eventCountdown.settings = (w,panel) => {
      panel.innerHTML += `
        <label>Title: <input id="evtTitle" value="${w.dataset.title||'Event'}"/></label>
        <label>Date: <input type="date" id="evtDate" value="${w.dataset.date||''}"/></label>
      `;
      panel.querySelector('#evtTitle').oninput = e => {
        w.dataset.title = e.target.value; update(); saveCurrentScreen();
      };
      panel.querySelector('#evtDate').onchange = e => {
        w.dataset.date = e.target.value; update(); saveCurrentScreen();
      };
    };
    const disp = document.createElement('div');
    disp.style.flex='1'; disp.style.display='flex';
    disp.style.flexDirection='column';
    disp.style.alignItems='center';
    disp.style.justifyContent='center';
    disp.style.fontSize='1.2em';
    cont.append(disp);

    function update() {
      const title = w.dataset.title || 'Event';
      const d = new Date(w.dataset.date);
      const now = new Date();
      const diff = Math.max(0, Math.ceil((d - now)/(1000*60*60*24)));
      disp.innerHTML = `<strong>${title}</strong><br>${diff} day${diff===1?'':'s'} left`;
    }
    if (!cfg?.date) {
      w.dataset.date = new Date().toISOString().substr(0,10);
    }
    update();
    setInterval(update, 1000*60*60); // refresh hourly
    return { w, cont };
  }
};
