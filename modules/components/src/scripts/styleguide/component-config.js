const configs = document.querySelectorAll('[data-component-config]');
configs.forEach(c => {
  const data = JSON.parse(c.textContent);
  c.textContent = JSON.stringify(data, null, 2);
});
