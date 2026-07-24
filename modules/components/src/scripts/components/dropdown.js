const componentModule = (elements) => {
  elements.forEach(dropdownComponentWrapper => {
    const trigger = dropdownComponentWrapper.querySelector('[data-dropdown-trigger]');
    const content = dropdownComponentWrapper.querySelector('[data-dropdown-content]');
    const closeButton = dropdownComponentWrapper.querySelector('[data-dropdown-close]');
    const isDrawer = content.getAttribute('data-dropdown-content') === 'drawer';
    const arrow = dropdownComponentWrapper.querySelector('[data-dropdown-arrow]');
    let resizeTimeout;

    const toggleDropdown = () => {
      content.classList.toggle('hidden');
      if (content.getAttribute('aria-hidden') === 'true') {
        content.setAttribute('aria-hidden', 'false');
      } else {
        content.setAttribute('aria-hidden', 'true');
      }
      positionArrow();
    };

    const toggleDrawer = () => {
      content.classList.toggle('-translate-x-full');
      content.classList.toggle('transform-none');
      if (content.getAttribute('aria-hidden') === 'true') {
        content.setAttribute('aria-hidden', 'false');
      } else {
        content.setAttribute('aria-hidden', 'true');
      }
    };


    const close = (event) => {
      event.stopPropagation();

      if (content.getAttribute('aria-hidden') === 'false') {
        if (isDrawer) {
          toggleDrawer();
        } else {
          toggleDropdown();
        }
      }
    };

    const watchClickOutside = (event) => {
      const didClickedOutside = !dropdownComponentWrapper.contains(event.target);
      if (didClickedOutside) {
        close(event);
      }
    };

    const supportKeyboardNavigation = (event) => {
      // press ESC -> close dropdown
      if (event.keyCode === 27) {
        close(event);
      }
    };

    const positionArrow = () => {
      if (!arrow) return;
      const toggleSize = trigger.getBoundingClientRect();
      const contentSize = content.getBoundingClientRect();
      const arrowSize = arrow.getBoundingClientRect();

      arrow.style.left = `${toggleSize.left - contentSize.left + toggleSize.width / 2 - arrowSize.width / 2}px`;
      arrow.classList.remove('invisible');
    };

    const positionOnResize = () => {
      clearTimeout(resizeTimeout);

      resizeTimeout = setTimeout(positionArrow, 200);
    };

    trigger.addEventListener('click', isDrawer ? toggleDrawer : toggleDropdown);
    document.addEventListener('click', watchClickOutside);
    dropdownComponentWrapper.addEventListener('keydown', supportKeyboardNavigation);

    if (isDrawer) {
      content.classList.remove('hidden');
    } else {
      window.addEventListener('resize', positionOnResize);
      content.addEventListener('click', close);
    }

    if (closeButton) {
      closeButton.addEventListener('click', close);
    }
  });
};

export default componentModule;
