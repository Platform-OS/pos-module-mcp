/*
  handles dropdowns
*/


// purpose:		places arrow in dropdown to point to the toggle button
// arguments: the main container for the dropdown (dom node)
//            if you want to initialize or destroy this module
// ************************************************************************
window.positionDropdownArrow = (container) => {

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  // the dropdown toggle button (dom node)
  const toggleButton = container.querySelector('[data-dropdown-toggle]');
  // the dropdown content (dom node)
  const content = container.querySelector('[data-dropdown-content]');
  // the pointer arrow (dom node)
  const arrow = container.querySelector('[data-dropdown-arrow]');
  // the class name that hides the arrow before it's positioned (string)
  const arrowHideClass = 'invisible';


  // purpose:		initializes the component
  // ------------------------------------------------------------------------
  const init = () => {
    setTimeout(positionArrow, 30);

    window.addEventListener('resize', positionOnResize);
    window.addEventListener('dropdown-hidden', () => {
      window.removeEventListener('resize', positionOnResize);
    }, {once: true});
  };



  // purpose:		resizes the arrow with debouce
  // ------------------------------------------------------------------------
  let resizeTimeout;
  const positionOnResize = () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(positionArrow, 200);
  };



  // purpose:		positions the arrow to point to the toggle button
  // ------------------------------------------------------------------------
 const positionArrow = () => {
    let toggleSize = toggleButton.getBoundingClientRect();
    let contentSize = content.getBoundingClientRect();
    let arrowSize = arrow.getBoundingClientRect();

    if(document.querySelector('html[dir="rtl"]')){
      arrow.style.left = toggleSize.left - contentSize.left + toggleSize.width / 2 - arrowSize.width / 2 + 'px';
    } else {
      arrow.style.left = toggleSize.left - contentSize.left + toggleSize.width / 2 - arrowSize.width / 2 + 'px';
    }

    arrow.classList.remove(arrowHideClass);
  };



  init();

  return true;

};
