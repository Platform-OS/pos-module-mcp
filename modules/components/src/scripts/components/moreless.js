const componentModule = (elements) => {
  elements.forEach(showmoreWrapper => {
    const short = showmoreWrapper.querySelector('.more-less__short');
    const full = showmoreWrapper.querySelector('.more-less__full');

    const more = showmoreWrapper.querySelector('.more-less__button--more');
    const less = showmoreWrapper.querySelector('.more-less__button--less');

    more.addEventListener('click', () => {
      short.classList.add("hidden");
      full.classList.remove("hidden");
    });

    less.addEventListener('click', () => {
      short.classList.remove("hidden");
      full.classList.add("hidden");
    });

  });
};

export default componentModule;
