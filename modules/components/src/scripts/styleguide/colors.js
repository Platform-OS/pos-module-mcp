const colorComponentsWrapper = document.querySelector('[data-styleguide-component="colors"]');
if (colorComponentsWrapper) {
  colorComponentsWrapper.querySelectorAll('[data-color]').forEach(colorElement => {
   const rgb = colorElement.getAttribute('data-color');
   const hexElement = colorElement.querySelector('[data-color-hex]');
   hexElement.textContent = '#'+rgb.match(/\d+/g).map(x=>(+x).toString(16).padStart(2,0)).join('');
  });
};
