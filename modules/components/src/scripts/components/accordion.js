const componentModule = (elements) => {
  elements.forEach(accordionWrapper => {
    const titles = accordionWrapper.querySelectorAll('.pos-accordion__title');
    const multiOpen = accordionWrapper.getAttribute("data-pos-accordion-multiopen") === "true" ? true : false;

    titles.forEach(title => {
      title.addEventListener('click', () => {
        const panel = title.nextElementSibling;
        const icon = title.firstElementChild;
        icon.classList.toggle("rotate-180");
        // close
        if (panel.style.maxHeight) {
          panel.style.maxHeight = null;
          title.setAttribute('aria-expanded', false);
        // open
        } else {
          panel.style.maxHeight = `${panel.scrollHeight}px`;
          title.setAttribute('aria-expanded', true);
          // close others, if needed
          if (!multiOpen) {
            titles.forEach(oTitle => {
              if (oTitle !== title) {
                const oPanel = oTitle.nextElementSibling;
                const oIcon = oTitle.firstElementChild;
                oIcon.classList.add("rotate-180");
                oPanel.style.maxHeight = null;
                oTitle.setAttribute('aria-expanded', false);
              }
            });
          }
        }
      });
    });
  });
};

export default componentModule;
