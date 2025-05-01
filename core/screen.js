// core/screen.js

import { saveCurrentScreen, loadWidget } from './state.js';

export const screens = { 'Screen 1': [] };
export let activeScreen = 'Screen 1';

export function initScreens() {
  renderScreenTabs();
  loadScreen(activeScreen);
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
      renderScreenTabs();
      switchScreen(nm);
    }
  };
  tabs.appendChild(add);
}

export function switchScreen(name) {
  saveCurrentScreen();
  loadScreen(name);
}

function clearCanvas() {
  document.getElementById('canvas').innerHTML = '';
}

function loadScreen(name) {
  clearCanvas();
  (screens[name] || []).forEach(cfg => {
    const widget = loadWidget(cfg);
    if (widget && cfg.html) {
      widget.cont.innerHTML = cfg.html;
    }
  });
  activeScreen = name;
  document.querySelectorAll('.screenTab').forEach(b => {
    b.classList.toggle('active', b.innerText === name);
  });
}
