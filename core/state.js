// core/state.js

import { screens, activeScreen } from './screen.js';
import { widgetRegistry } from '../widgets/registry.js';

export function saveCurrentScreen() {
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
      html:   w.querySelector('.content')?.innerHTML || '',
      locked: w.dataset.locked || 'false'
    });
  });
  screens[activeScreen] = arr;
}

export function loadWidget(cfg) {
  if (!widgetRegistry[cfg.type]) {
    console.warn(`Unknown widget type: ${cfg.type}`);
    return null;
  }
  return widgetRegistry[cfg.type](cfg);
}
