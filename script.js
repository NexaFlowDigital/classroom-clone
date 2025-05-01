// script.js

// ─── In‐memory Screens ───
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

  // Restore position & size if provided
  if (cfg) {
    ['left','top','width','height','z'].forEach(p => {
      if (cfg[p]) w.style[p] = cfg[p];
    });
    if (cfg.z) w.style.zIndex = cfg.z;
  } else {
    w.style.left   = '20px';
    w.style.top    = '20px';
    w.style.width  = '200px';
    w.style.height = '200px';
    w.style.zIndex = ++topZ;
    w.dataset.z    = w.style.zIndex;
  }

  // Make resizable (unless locked)
  w.style.resize = cfg && cfg.locked==='true' ? 'none' : 'both';

  // Content container (no header)
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

// ─── Remove Background as a widget and handle it globally ───
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('widgetSelect');
  const bgOption = select.querySelector('option[value="setBackground"]');
  if (bgOption) bgOption.remove();
});

// ─── Global Settings Panel: add Canvas Background control ───
document.addEventListener('DOMContentLoaded', () => {
  const sp = document.getElementById('settingsPanel');
  const bgLabel = document.createElement('label');
  bgLabel.innerHTML = 'Canvas bg: <input type="color" id="canvasBg" value="#ffffff"/>';
  sp.insertBefore(bgLabel, sp.querySelector('#closeSettings'));
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
  // TODO: push `screens` & `activeScreen` to Firebase
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
  add.id = 'addScreen';
  add.innerText = '+';
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
    const style = getComputedStyle(w);
    arr.push({
      type:   w.dataset.type,
      left:   style.left,
      top:    style.top,
      width:  style.width,
      height: style.height,
      z:      style.zIndex,
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
  });
  activeScreen = name;
  persistScreens();
  document.querySelectorAll('.screenTab').forEach(b => {
    b.classList.toggle('active', b.innerText === name);
  });
}
function switchScreen(name) {
  saveCurrentScreen();
  loadScreen(name);
}

// ─── Annotation ───
let annotating = false, annoCanvas, annoCtx, annoHistory = [];
function initAnnotation() {
  if (annoCanvas) return;
  const cv = document.getElementById('canvas');
  annoCanvas = document.createElement('canvas');
  annoCanvas.width = cv.clientWidth;
  annoCanvas.height = cv.clientHeight;
  Object.assign(annoCanvas.style, {
    position:'absolute', top:0, left:0, zIndex:400, pointerEvents:'none'
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
  widgetSettingsPanel.style.top  = `${r.bottom + 4 + window.scrollY}px`;
  widgetSettingsPanel.style.left = `${r.left + window.scrollX}px`;

  // Handlers
  gen.querySelector('#bringFront').onclick = () => {
    widget.style.zIndex = ++topZ; saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#sendBack').onclick = () => {
    widget.style.zIndex = --bottomZ; saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveForward').onclick = () => {
    widget.style.zIndex = parseInt(widget.style.zIndex||0) + 1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#moveBackward').onclick = () => {
    widget.style.zIndex = parseInt(widget.style.zIndex||0) - 1;
    saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#delWidget').onclick = () => {
    widget.remove(); saveCurrentScreen(); widgetSettingsPanel.classList.add('hidden');
  };
  gen.querySelector('#lockWidget').onchange = e => {
    const locked = e.target.checked;
    widget.dataset.locked = locked;
    widget.style.resize   = locked ? 'none' : 'both';
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

  // Annotation toggle
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

  // Save button
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
  // ... your existing widget definitions and .settings hooks remain unchanged ...
  // e.g. text, timer, clock, soundLevel, dice, scoreboard, visualTimer, draw, calendar, screenShare, etc.
};
