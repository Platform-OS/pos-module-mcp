const iconComponentsWrapper = document.querySelector('[data-styleguide-component="Icon"]');
if (iconComponentsWrapper) {
  iconComponentsWrapper.querySelectorAll('svg').forEach(svgElement => {
    const name = svgElement.getAttribute('data-icon');
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-grid';
    wrapper.style.justifyItems = 'center';
    wrapper.style.width = '180px';
    wrapper.style.marginBottom = '16px';
    svgElement.parentElement.prepend(wrapper);
    wrapper.append(svgElement);
    wrapper.insertAdjacentHTML('beforeend', name);
  });
};
