// widgets/registry.js

import text from './text.js';
import timer from './timer.js';
import clock from './clock.js';
// Import more widgets as you create them...

export const widgetRegistry = {
  text,
  timer,
  clock,
  // Add additional widgets here...
};

export function registerWidgets() {
  window.widgetRegistry = widgetRegistry;
}
