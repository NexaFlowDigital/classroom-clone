// script.js

// ─── In‐memory Screens ───
let screens = { 'Screen 1': [] };
let activeScreen = 'Screen 1';

// z-index management
let topZ = 1000, bottomZ = 0;

// ─── Utility: Draggable & Resizable (unless locked) ───
function makeDraggable(el) {
  let dx, dy, dragging = false;
  el.addEventListener('mousedown', e => {
    if (e.target.closest('.widget-settings-icon')) return;
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
  // Position & size
  if (cfg) {
    ['left','top','width','height','z'].forEach(p => { if (cfg[p]) w.style[p] = cfg[p]; });
    if (cfg.z) w.style.zIndex = cfg.z;
  } else {
    w.style.left = '20px'; w.style.top = '20px';
    w.style.width = '200px'; w.style.height = '200px';
    w.style.zIndex = ++topZ;
    w.dataset.z = w.style.zIndex;
  }
  // Content container
  const cont = document.createElement('div');
  cont.className = 'content';
  w.appendChild(cont);

  // Settings icon container (clickable region)
  const icon = document.createElement('div');
  icon.className = 'widget-settings-icon';
  w.appendChild(icon);

  document.getElementById('canvas').appendChild(w);
  makeDraggable(w);

  // Open settings when icon clicked
  w.addEventListener('click', e => {
    const rect = w.getBoundingClientRect();
    const withinIcon = (
      e.clientX >= rect.right - 24 &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.top + 24
    );
    if (withinIcon) {
      e.stopPropagation();
      openWidgetSettings(w);
    }
  });

  return { w, cont };
}

// ─── Screen/Tab Management ───
function initScreens() {
  renderScreenTabs();
  loadScreen(activeScreen);
}
function persistScreens() {
  // TODO: Save `screens` & `activeScreen` to Firebase
}
function renderScreenTabs() {
  const tabs = document.getElementById('screenTabs');
  tabs.innerHTML = '';
  Object.keys(screens).forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'screenTab' + (name === activeScreen ? ' active' : '');
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
  const list = [];
  document.querySelectorAll('.widget').forEach(w => {
    const style = getComputedStyle(w);
    list.push({
      type: w.dataset.type,
      left:   style.left,
      top:    style.top,
      width:  style.width,
      height: style.height,
      z:      style.zIndex,
      html:   w.querySelector('.content').innerHTML,
      ...w.dataset
    });
  });
  screens[activeScreen] = list;
  persistScreens();
}
function clearCanvas() {
  document.getElementById('canvas').innerHTML = '';
}
function loadScreen(name) {
  clearCanvas();
  (screens[name] || []).forEach(cfg => {
    const { w, cont } = widgetRegistry[cfg.type](cfg);
    cont.innerHTML = cfg.html;
  });
  activeScreen = name;
  persistScreens();
  document.querySelectorAll('.screenTab')
    .forEach(btn => btn.classList.toggle('active', btn.innerText === name));
}
function switchScreen(name) {
  saveCurrentScreen();
  loadScreen(name);
}

// ─── Global Toolbar & Annotation ───
let annotating = false, annoCanvas, annoCtx, annoHistory = [];
function initAnnotation() {
  if (annoCanvas) return;
  const cv = document.getElementById('canvas');
  annoCanvas = document.createElement('canvas');
  annoCanvas.width = cv.clientWidth;
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
    saveCurrentScreen(); // TODO: Save to Firebase
  };
}

// ─── Widget Settings Panel ───
const widgetSettingsPanel = document.getElementById('widgetSettingsPanel');
function openWidgetSettings(widget) {
  widgetSettingsPanel.innerHTML = '';
  widgetSettingsPanel.classList.remove('hidden');

  // Generic controls
  const gen = document.createElement('div');
  gen.innerHTML = `
    <button id="bringFront">Bring to Front</button>
    <button id="sendBack">Send to Back</button>
    <button id="moveForward">Move Forward</button>
    <button id="moveBackward">Move Backward</button>
    <label><input type="checkbox" id="lockWidget" ${widget.dataset.locked==='true'?'checked':''}/> Lock</label>
    <hr/>
  `;
  widgetSettingsPanel.appendChild(gen);

  // Widget-specific settings
  const type = widget.dataset.type;
  if (widgetRegistry[type].settings) {
    widgetRegistry[type].settings(widget, widgetSettingsPanel);
  }

  // Position panel near widget
  const rect = widget.getBoundingClientRect();
  widgetSettingsPanel.style.top = `${rect.top + window.scrollY + 24}px`;
  widgetSettingsPanel.style.left = `${rect.left + window.scrollX + rect.width - widgetSettingsPanel.offsetWidth - 8}px`;

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
    widget.style.zIndex = parseInt(widget.style.zIndex || 0) + 1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveBackward').onclick = () => {
    widget.style.zIndex = parseInt(widget.style.zIndex || 0) - 1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  const lockCb = gen.querySelector('#lockWidget');
  lockCb.onchange = () => {
    const locked = lockCb.checked;
    widget.dataset.locked = locked;
    widget.classList.toggle('locked', locked);
    widget.style.resize = locked ? 'none' : 'both';
    saveCurrentScreen();
  };
}

// Close settings on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#widgetSettingsPanel') &&
      !e.target.closest('.widget')) {
    widgetSettingsPanel.classList.add('hidden');
  }
});

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
  initScreens();

  // Global toolbar
  const collapseBtn = document.getElementById('collapseBtn'),
        tools       = document.getElementById('tools');
  collapseBtn.onclick = () => {
    const hidden = tools.style.display==='none';
    tools.style.display = hidden ? 'flex' : 'none';
    collapseBtn.innerText = hidden ? '▲' : '▼';
  };

  // Global settings panel
  const panel = document.getElementById('settingsPanel');
  document.getElementById('settingsBtn').onclick = () => panel.classList.remove('hidden');
  document.getElementById('closeSettings').onclick = () => panel.classList.add('hidden');
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
  document.getElementById('penBtn').onclick = () => annoCtx.globalCompositeOperation = 'source-over';
  document.getElementById('penColor').oninput = e => annoCtx.strokeStyle = e.target.value;
  document.getElementById('penSize').oninput = e => annoCtx.lineWidth = e.target.value;
  document.getElementById('eraserBtn').onclick = () => annoCtx.globalCompositeOperation = 'destination-out';
  document.getElementById('undoBtn').onclick = () => {
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

  // Save button
  document.getElementById('saveBtn').onclick = () => {
    saveCurrentScreen();
    alert('Screen saved (in-memory). // TODO: push to Firebase');
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
    // Settings generator (for later)
    widgetRegistry.text.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Text color: <input type="color" id="txtColor" value="${w.dataset.txtColor||'#000'}"/></label>
        <label>BG color: <input type="color" id="bgColor" value="${w.dataset.bgColor||'#fff'}"/></label>
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
        cont.querySelector('div').style.color = e.target.value;
        w.dataset.txtColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#bgColor').oninput = e => {
        cont.querySelector('div').style.background = e.target.value;
        w.dataset.bgColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#txtSize').onchange = e => {
        cont.querySelector('div').style.fontSize = e.target.value;
        w.dataset.txtSize = e.target.value; saveCurrentScreen();
      };
    };

    // Main content
    const div = document.createElement('div');
    div.contentEditable = true;
    div.style.flex = '1';
    div.innerHTML = cfg?.html || 'Click to edit…';
    cont.append(div);

    // Formatting toolbar inside settings only
    return { w, cont };
  },

  // ─ Background ─
  setBackground: cfg => {
    const { w, cont } = createWidget('setBackground', cfg);
    widgetRegistry.setBackground.settings = (w, panel) => {
      panel.innerHTML += `
        <button data-bg="#FDEBD0">🟨</button>
        <button data-bg="#AED6F1">🟦</button>
        <input type="text" placeholder="YouTube URL" id="bgYouTube"/>
        <button id="applyBg">Apply</button>
      `;
      panel.querySelectorAll('button[data-bg]').forEach(b => {
        b.onclick = () => {
          document.getElementById('canvas').style.background = b.dataset.bg;
          saveCurrentScreen();
        };
      });
      panel.querySelector('#applyBg').onclick = () => {
        const url = panel.querySelector('#bgYouTube').value;
        if (url) {
          document.getElementById('canvas').style.background =
            `url('https://img.youtube.com/vi/${url.split('v=')[1]}/0.jpg') center/cover`;
          saveCurrentScreen();
        }
      };
    };
    return { w, cont };
  },

  // ─ Timer ─
  timer: cfg => {
    const { w, cont } = createWidget('timer', cfg);
    widgetRegistry.timer.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Text color: <input type="color" id="tmTxtColor" value="${w.dataset.txtColor||'#000'}"/></label>
        <label>BG color: <input type="color" id="tmBgColor" value="${w.dataset.bgColor||'#fff'}"/></label>
        <label>Font size:
          <select id="tmSize">
            <option value="14px">14</option>
            <option value="18px" selected>18</option>
            <option value="24px">24</option>
          </select>
        </label>
      `;
      panel.querySelector('#tmTxtColor').oninput = e => {
        cont.querySelector('.timer-display').style.color = e.target.value;
        w.dataset.txtColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#tmBgColor').oninput = e => {
        cont.querySelector('.timer-display').style.background = e.target.value;
        w.dataset.bgColor = e.target.value; saveCurrentScreen();
      };
      panel.querySelector('#tmSize').onchange = e => {
        cont.querySelector('.timer-display').style.fontSize = e.target.value;
        w.dataset.size = e.target.value; saveCurrentScreen();
      };
    };
    // ... existing timer logic from earlier ...
    return widgetRegistry.timerInner(cfg, w, cont);
  },
  // You would similarly wrap timerInner logic from previous code here...
  // ─ Clock ─
  clock: cfg => {
    const { w, cont } = createWidget('clock', cfg);
    widgetRegistry.clock.settings = (w, panel) => {
      panel.innerHTML += `
        <button id="toggle24">${w.dataset.format24==='true'?'24hr':'12hr'}</button>
        <label>Text color: <input type="color" id="clkColor" value="${w.dataset.color||'#000'}"/></label>
      `;
      panel.querySelector('#toggle24').onclick = e => {
        const f24 = w.dataset.format24 !== 'true';
        w.dataset.format24 = f24;
        e.target.innerText = f24 ? '24hr' : '12hr';
        saveCurrentScreen();
      };
      panel.querySelector('#clkColor').oninput = e => {
        cont.querySelector('div').style.color = e.target.value;
        w.dataset.color = e.target.value; saveCurrentScreen();
      };
    };
    // ... existing clock logic ...
    return widgetRegistry.clockInner(cfg, w, cont);
  },

  // ─ Sound Level ─
  soundLevel: cfg => {
    const { w, cont } = createWidget('soundLevel', cfg);
    widgetRegistry.soundLevel.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Sensitivity: <input type="range" min="0" max="1" step="0.01" id="sens" value="${w.dataset.sens||0.2}"/></label>
      `;
      panel.querySelector('#sens').oninput = e => {
        w.dataset.sens = e.target.value; saveCurrentScreen();
      };
    };
    // ... improved smoothing logic ...
    return widgetRegistry.soundLevelInner(cfg, w, cont);
  },

  // ─ Dice ─
  dice: cfg => {
    const { w, cont } = createWidget('dice', cfg);
    widgetRegistry.dice.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Dice type:
          <select id="diceType">
            <option value="6" ${w.dataset.sides==='6'?'selected':''}>d6</option>
            <option value="20" ${w.dataset.sides==='20'?'selected':''}>d20</option>
          </select>
        </label>
      `;
      panel.querySelector('#diceType').onchange = e => {
        w.dataset.sides = e.target.value; saveCurrentScreen();
      };
    };
    // ... fixed roll logic ...
    return widgetRegistry.diceInner(cfg, w, cont);
  },

  // ─ Scoreboard ─
  scoreboard: cfg => {
    const { w, cont } = createWidget('scoreboard', cfg);
    widgetRegistry.scoreboard.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Team count:
          <input type="number" id="teamCount" min="2" max="8" value="${w.dataset.count||2}"/>
        </label>
      `;
      panel.querySelector('#teamCount').oninput = e => {
        w.dataset.count = e.target.value;
        // TODO: re-render teams
        saveCurrentScreen();
      };
    };
    // ... rebuild basic scoreboard logic ...
    return widgetRegistry.scoreboardInner(cfg, w, cont);
  },

  // ─ Visual Timer ─
  visualTimer: cfg => {
    const { w, cont } = createWidget('visualTimer', cfg);
    widgetRegistry.visualTimer.settings = (w, panel) => {
      panel.innerHTML += `
        <label>Total secs: <input type="number" id="vtTot" value="${w.dataset.total||60}"/></label>
      `;
      panel.querySelector('#vtTot').oninput = e => {
        w.dataset.total = e.target.value;
        // TODO: restart timer
        saveCurrentScreen();
      };
    };
    return widgetRegistry.visualTimerInner(cfg, w, cont);
  },

  // ─ Draw ─
  draw: cfg => {
    const { w, cont } = createWidget('draw', cfg);
    widgetRegistry.draw.settings = (w, panel) => {
      panel.innerHTML += `
        <button id="clearDraw">Clear</button>
        <select id="bgPattern">
          <option value="blank">Blank</option>
          <option value="lined">Lined</option>
          <option value="grid">Grid</option>
        </select>
      `;
      panel.querySelector('#clearDraw').onclick = () => {
        // TODO: clear canvas
        saveCurrentScreen();
      };
      panel.querySelector('#bgPattern').onchange = e => {
        w.dataset.pattern = e.target.value;
        // TODO: update bg pattern
        saveCurrentScreen();
      };
    };
    return widgetRegistry.drawInner(cfg, w, cont);
  },

  // ─ Calendar ─
  calendar: cfg => {
    const { w, cont } = createWidget('calendar', cfg);
    widgetRegistry.calendar.settings = (w, panel) => {
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
        // TODO: re-render
        saveCurrentScreen();
      };
      panel.querySelector('#showWeekends').onchange = e => {
        w.dataset.showWeekends = e.target.checked;
        // TODO: re-render
        saveCurrentScreen();
      };
    };
    return widgetRegistry.calendarInner(cfg, w, cont);
  },

  // ─ Screen Share ─
  screenShare: cfg => {
    const { w, cont } = createWidget('screenShare', cfg);
    widgetRegistry.screenShare.settings = (w, panel) => {
      panel.innerHTML += `<p>No settings available</p>`;
    };
    navigator.mediaDevices.getDisplayMedia({ video: true })
      .then(stream => {
        const v = document.createElement('video');
        v.srcObject = stream; v.autoplay = true;
        Object.assign(v.style, { flex: '1', objectFit: 'contain' });
        cont.appendChild(v);
      })
      .catch(err => cont.innerText = '❌ ' + err.message);
    return { w, cont };
  },

  // ─ Other widgets (skeleton) ─
  poll: cfg => { /* ... */ return createWidget('poll', cfg); },
  timetable: cfg => { /* ... */ return createWidget('timetable', cfg); },
  randomizer: cfg => { /* ... */ return createWidget('randomizer', cfg); },
  groupMaker: cfg => { /* ... */ return createWidget('groupMaker', cfg); },
  stickers: cfg => { /* ... */ return createWidget('stickers', cfg); },
  image: cfg => { /* ... */ return createWidget('image', cfg); },
  video: cfg => { /* ... */ return createWidget('video', cfg); },
  embed: cfg => { /* ... */ return createWidget('embed', cfg); },
  hyperlink: cfg => { /* ... */ return createWidget('hyperlink', cfg); },
  qrCode: cfg => { /* ... */ return createWidget('qrCode', cfg); },
  stopwatch: cfg => { /* ... */ return createWidget('stopwatch', cfg); },
  webcam: cfg => { /* ... */ return createWidget('webcam', cfg); },
  // etc.
};
