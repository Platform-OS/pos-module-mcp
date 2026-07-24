/* The main entry file for the production (components) bundle */
import './styles/components.css';
import './scripts/components/flash';

import select from './scripts/components/select';
import popup from './scripts/components/popup';
import accordion from './scripts/components/accordion';
import tabs from './scripts/components/tabs';
import moreless from './scripts/components/moreless';
import dropdown from './scripts/components/dropdown';

const COMPONENT_MODULES = {
 'select': select,
 'popup': popup,
 'accordion': accordion,
 'tabs': tabs,
 'moreless': moreless,
 'dropdown': dropdown
};

window.posComponents = window.posComponents || {};

const initialize = async (component) => {
  let components = [];
  if (Array.isArray(component)) {
    components = component;
  } else if (!component) {
    components = Object.keys(COMPONENT_MODULES);
  } else {
    components.push(component);
  }

  for (component of components) {
    if (!COMPONENT_MODULES[component]) {
      console.warn(`${component} module is not implemented`);
      continue;
    }
    const elements = document.querySelectorAll(`[data-pos-component="${component}"]:not([data-pos-initialized])`);
    if (elements.length) {
      COMPONENT_MODULES[component](elements);
      Array.from(elements).map(e => e.setAttribute('data-pos-initialized', true));
    }
  }
};

window.posComponents.initialize = initialize;
document.addEventListener('DOMContentLoaded', () => initialize());
