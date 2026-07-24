/*
  super simple slider that uses browser-native scrolling methods
*/



// purpose:		handles the slider scrolling
// arguments: user settings that will overwrite the defaults (object)
// ************************************************************************
const slider = function(userSettings){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the main container for the slider (dom element)
  module.settings.container = userSettings.container ? userSettings.container : document.querySelector('[data-slider]');
  // the slider content list (dom element)
  module.settings.content = userSettings.content ? userSettings.content : module.settings.container.querySelector(':scope > ul');
  // scroll to previous button (dom element)
  module.settings.prevArrow = userSettings.prevArrow ? userSettings.prevArrow : module.settings.container.querySelector('[data-slider-prev]');
  // scroll to next button (dom element)
  module.settings.nextArrow = userSettings.prevArrow ? userSettings.nextArrow : module.settings.container.querySelector('[data-slider-next]');
  // if the page is in RTL mode (bool)
  module.settings.isRtl = (document.querySelector('html').getAttribute('dir') === 'rtl') ? true : false;



  // purpose:		initializes the component
  // ------------------------------------------------------------------------
  module.init = () => {
    // prev arrow behavior
    module.settings.prevArrow.addEventListener('click', () => {
      module.scrollPrev();
    });

    // next arrow behavior
    module.settings.nextArrow.addEventListener('click', () => {
      module.scrollNext();
    });

    // disable the arrows when we go to the start/end
    let contentScrollTimout;
    module.settings.content.addEventListener('scroll', () => {
      clearTimeout(contentScrollTimout);

      contentScrollTimout = setTimeout(() => module.toggleArrows(), 150);
    });

    // disable the next arrow if there is nothing to scroll
    if(module.settings.content.scrollWidth <= module.settings.content.getBoundingClientRect().width){
      module.settings.nextArrow.disabled = true;
    }
  };


  // purpose:		disabled/enables the arrows depending on the scroll position
  // ------------------------------------------------------------------------
  module.toggleArrows = () => {
    if(module.settings.content.scrollLeft === 0){
      module.settings.prevArrow.disabled = true;
    } else {
      module.settings.prevArrow.disabled = false;
    }

    let rtlCompensation = module.settings.isRtl ? -1 : 1;

    if(module.settings.content.scrollLeft * rtlCompensation + module.settings.content.getBoundingClientRect().width >= module.settings.content.scrollWidth){
      module.settings.nextArrow.disabled = true;
    } else {
      module.settings.nextArrow.disabled = false;
    }
  };


  // purpose:		scrolls to view the next invisble category
  // ------------------------------------------------------------------------
  module.scrollNext = () => {

    let containerRect = module.settings.content.getBoundingClientRect();
    let lastCategoryX = module.settings.isRtl ? containerRect.left + 5 : containerRect.right - 5;
    let lastCategoryY = containerRect.top + 5;

    let firstInvisibleCategory = document.elementFromPoint(lastCategoryX, lastCategoryY)?.closest('li').nextElementSibling;


    firstInvisibleCategory && firstInvisibleCategory.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });

  };


  // purpose:		scrolls to view the previous invisible category
  // ------------------------------------------------------------------------
  module.scrollPrev = () => {

    let containerRect = module.settings.content.getBoundingClientRect();
    let firstCategoryX = module.settings.isRtl ? containerRect.right - 5 : containerRect.left + 5;
    let firstCategoryY = containerRect.top + 5;

    let firstInvisibleCategory = document.elementFromPoint(firstCategoryX, firstCategoryY)?.closest('li').previousElementSibling;


    firstInvisibleCategory && firstInvisibleCategory.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });

  };


  module.init();

};



document.querySelectorAll('[data-slider]').forEach((element) => {
  new slider({
    container: element
  });
});