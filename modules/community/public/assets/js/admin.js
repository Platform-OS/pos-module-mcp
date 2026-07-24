/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 1683:
/***/ (() => {

api.toggleList = function(list) {
  const module = this;
  module.settings = {};
  module.settings.container = list;
  module.init = () => {
    if (module.settings.container.querySelectorAll('[type="checkbox"]:not(:checked)').length) {
      return module.check();
    } else {
      return module.uncheck();
    }
  };
  module.uncheck = () => {
    module.settings.container.querySelectorAll('[type="checkbox"]').forEach((item) => {
      item.checked = false;
    });
    return false;
  };
  module.check = () => {
    module.settings.container.querySelectorAll('[type="checkbox"]').forEach((item) => {
      item.checked = true;
    });
    return true;
  };
  return module.init();
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	// WebpackRequireFrom
/******/ 	typeof __webpack_require__ !== "undefined" && Object.defineProperty(__webpack_require__, "p", {
/******/ 	  get: function () {
/******/ 	try {
/******/ 	  if (typeof window.cdnUrl !== "string") {
/******/ 	    throw new Error("WebpackRequireFrom: 'window.cdnUrl' is not a string or not available at runtime. See https://github.com/agoldis/webpack-require-from#troubleshooting");
/******/ 	  }
/******/ 	  return window.cdnUrl;
/******/ 	} catch (e) {
/******/ 	  if (!false) {
/******/ 	    console.error(e);
/******/ 	  }
/******/ 	  return "auto";
/******/ 	}
/******/ 	 },
/******/ 	  set: function (newPublicPath) {
/******/ 	    console.warn("WebpackRequireFrom: something is trying to override webpack public path. Ignoring the new value" + newPublicPath  + ".");
/******/ 	}
/******/ 	});
/******/ 	
/************************************************************************/
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/* harmony import */ var _admin_toggleLists_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1683);
/* harmony import */ var _admin_toggleLists_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_admin_toggleLists_js__WEBPACK_IMPORTED_MODULE_0__);


})();

/******/ })()
;