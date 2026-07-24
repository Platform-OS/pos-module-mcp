const togglePopup = (popupId, forceClose = false) => {
  const popup = document.querySelector(`[data-popup-id="${popupId}"]`);
  const backdrop = document.querySelector(`[data-backdrop-id="${popupId}"]`);
  if (forceClose) {
    popup.classList.add("hidden");
    backdrop.classList.add("hidden");
  } else {
    popup.classList.toggle("hidden");
    backdrop.classList.toggle("hidden");
  }

  // open
  if (!forceClose && !popup.classList.contains('hidden')) {
    popup.setAttribute("aria-hidden", false);
    const firstInput = popup.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  // close
  } else {
    popup.setAttribute("aria-hidden", true);
  }
};

const closePopup = popupId => {
  togglePopup(popupId, true);
};

// opener buttons
const popupOpeners = document.querySelectorAll('[data-popup-open-id]');
popupOpeners.forEach(opener => {
  opener.addEventListener('click', (event) => {
    event.stopPropagation();
    const popupId = opener.getAttribute('data-popup-open-id');
    togglePopup(popupId);
  });
});

const componentModule = (elements) => {
  elements.forEach(popup => {
    const popupId = popup.getAttribute('data-popup-id');
    const closed = popup.getAttribute('data-closed');
    const closable = popup.getAttribute('data-closable');
    if (closable === "true" ) {
      // popup close by ESC
      popup.addEventListener("keydown", event => {
        if (event.keyCode === 27) {
          closePopup(popupId);
        }
      });
      // click out
      document.addEventListener("click", (event) => {
        const didClickedOutside = !popup.contains(event.target);
        if (didClickedOutside) {
          closePopup(popupId);
        }
      });
    }
    // auto-open
    if (closed === "false") {
      togglePopup(popupId);
    }
  });
};

export default componentModule;
