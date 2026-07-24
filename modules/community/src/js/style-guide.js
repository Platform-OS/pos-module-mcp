/*
  handling various aspects of the style guide
  that can be found under /style-guide/
*/


// purpose:   the main style guide namespace
// ************************************************************************
const styleGuide = function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    styleGuide.colors();
    styleGuide.typography();
    styleGuide.icons();
    styleGuide.clipboard();
    styleGuide.flashes();
  };

  module.init();

};



// purpose:		handles the color section
// ************************************************************************
styleGuide.colors = () => {

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the container with the colors (dom node)
  module.settings.container = document.querySelector('#colors');
  // the list with the properties color (dom nodes)
  module.settings.propertiesList = module.settings.container.querySelectorAll('dl');


  // purpose:   initializes module
  // ------------------------------------------------------------------------
  module.init = () => {
    module.showBackgroundClass();
    module.showBackgroundColor();
  };


  // purpose:		convert the color from rgb[a] to hex
  // arguments: color in rgb[a]
  // returns:   color in hex
  // ------------------------------------------------------------------------
  function rgbaToHex(color){
    if( color.indexOf('#') != -1 ) return color;

    color = color
                .replace('rgba', '')
                .replace('rgb', '')
                .replace('(', '')
                .replace(')', '');
    color = color.split(',');

    return  '#'
            + ( '0' + parseInt(color[0], 10).toString(16) ).slice(-2)
            + ( '0' + parseInt(color[1], 10).toString(16) ).slice(-2)
            + ( '0' + parseInt(color[2], 10).toString(16) ).slice(-2);
  }


  // purpose:		finds the background color class name and shows it in corresponding place
  // ------------------------------------------------------------------------
  module.showBackgroundClass = () => {
    module.settings.propertiesList.forEach(element => {
      let classNames = '';

      Array.from(element.parentElement.querySelector('.styleGuide-colorBox').children).forEach(element => {
        classNames += '<li>' + Array.from(element.classList).filter((name) => name.startsWith('bg-')) + '</li>';
      });

      element.querySelector('.styleGuide-className ul').insertAdjacentHTML('beforeend', classNames.replaceAll('bg', ''));
    });
  };


  // purpose:		finds the background color and shows it in corresponding place
  // ------------------------------------------------------------------------
  module.showBackgroundColor = () => {
    module.settings.propertiesList.forEach(element => {
      let colorNames = '';

      Array.from(element.parentElement.querySelector('.styleGuide-colorBox').children).forEach(element => {
        colorNames += '<li>' + rgbaToHex(window.getComputedStyle(element).getPropertyValue('background-color')) + '</li>';
      });

      element.querySelector('.styleGuide-color ul').insertAdjacentHTML('beforeend', colorNames);
    });
  };


  module.init();

};



// purpose:		handles the icons section
// ************************************************************************
styleGuide.icons = () => {

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the container with the icons list (dom node)
  module.settings.container = document.querySelector('#icons');
  // the attribute that stores the icon name (string)
  module.settings.iconName = 'data-icon';
  // the icons (dom node)
  module.settings.icons = module.settings.container.querySelectorAll(`[${module.settings.iconName}]`);


  // purpose:   initializes module
  // ------------------------------------------------------------------------
  module.init = () => {
    module.wrap();
    module.showNames();
    module.clipboard();
    module.removeOverwritten();
  };


  // purpose:   wrap icons in list elements
  // ------------------------------------------------------------------------
  module.wrap = () => {
    module.settings.icons.forEach((item) => {
      let wrapper = document.createElement('li');

      wrapper.classList.add('flex', 'flex-col', 'items-center', 'cursor-pointer');

      item.parentNode.insertBefore(wrapper, item);
      wrapper.appendChild(item);
    });
  };


  // purpose:   shows the icon names
  // ------------------------------------------------------------------------
  module.showNames = () => {
    module.settings.icons.forEach((item) => {
      item.parentElement.insertAdjacentHTML('beforeend', item.getAttribute(module.settings.iconName));
    });
  };


  // purpose:   copies the icon render function to clipboard on click
  // ------------------------------------------------------------------------
  module.clipboard = () => {
    module.settings.icons.forEach((icon) => {
      icon.parentElement.addEventListener('click', () => {
        let name = icon.parentElement.childNodes[1].textContent.trim();

        navigator.clipboard.writeText(`{% theme_render_rc 'components/atoms/icon', name: '${name}' %}`).then(() => {
          icon.parentElement.classList.add('text-confirmation');

          setTimeout(() => {
            icon.parentElement.classList.remove('text-confirmation');
          }, 800);
        }, () => {
          new Error('Could not copy the code to clipboard');
        });
      });
    });
  };

  // purpose:   removes duplicated icons when they are overwritten in the custom theme
  // ------------------------------------------------------------------------
  module.removeOverwritten = () => {
    module.settings.icons.forEach((icon) => {
      let current = module.settings.container.querySelectorAll(`[${module.settings.iconName}="${icon.dataset.icon}"]`);

      if(current.length > 1){
        current[1].parentElement.remove();
      }
    });
  };


  module.init();
};


// purpose:		handles the typography section
// ************************************************************************
styleGuide.typography = () => {

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the container for basic typography info (dom node)
  module.settings.container = document.querySelector('#typography');
  // class name for the examples box (string)
  module.settings.typographyExample = 'styleGuide-example';


  // purpose:   initializes module
  // ------------------------------------------------------------------------
  module.init = () => {
    module.showTextInfo();
  };


  // purpose:		sets the basic font information
  // ------------------------------------------------------------------------
  module.showTextInfo = () => {

    let rows = Array.from(module.settings.container.children).filter(elements => {
      return elements.matches('div');
    });

    rows.forEach((row) => {
      let textStyle = window.getComputedStyle(row.querySelector('.' + module.settings.typographyExample).firstElementChild);

      if(row.querySelector('.styleGuide-class')){
        row.querySelector('.styleGuide-class').textContent = row.querySelector('.' + module.settings.typographyExample).firstElementChild.classList;
      }
      row.querySelector('.styleGuide-color').textContent = textStyle.getPropertyValue('color');
      row.querySelector('.styleGuide-font').textContent = textStyle.getPropertyValue('font-family');
      row.querySelector('.styleGuide-size').textContent = textStyle.getPropertyValue('font-size');
      row.querySelector('.styleGuide-fontWeight').textContent = textStyle.getPropertyValue('font-weight');
      row.querySelector('.styleGuide-lineHeight').textContent = textStyle.getPropertyValue('line-height');
    });
  };

  module.init();

};



// purpose:		handles copying the text to clipboard
// ************************************************************************
styleGuide.clipboard = () => {

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the boxes with the example code in them (dom node)
  module.settings.code = document.querySelectorAll('.styleGuide-code');
  // the template for the button that activates the copying (dom node)
  module.settings.button = document.querySelector('#styleGuide-copyButton');
  // the selector for the button that activates the copying (string)
  module.settings.buttonSelector = '.styleGuide-copy';


  // purpose:   initializes module
  // ------------------------------------------------------------------------
  module.init = () => {
    module.addCopyButton();
    module.clipboard();
  };


  module.addCopyButton = () => {
    module.settings.code.forEach((element) => {
      element.appendChild(module.settings.button.content.cloneNode(true));
    });
  };


  // purpose:		saves the code content to clipboard on button click
  // ------------------------------------------------------------------------
  module.clipboard = () => {
    document.addEventListener('click', (event) => {
      if(event.target.matches(module.settings.buttonSelector)){
        let text = event.target.parentElement.childNodes[0].textContent.trim();

        navigator.clipboard.writeText(text).then(() => {
          event.target.classList.add('text-confirmation');

          setTimeout(() => {
            event.target.classList.remove('text-confirmation');
          }, 800);
        }, () => {
          new Error('Could not copy the code to clipboard');
        });
      }
    });
  };



  // purpose:		moves flash messages to be static
  // ************************************************************************
  styleGuide.flashes = () => {
    document.querySelector('#flashes').style.position = 'static';
    document.querySelector('#styleGuide-flashes .styleGuide-example').appendChild(document.querySelector('#flashes'));
  };


  module.init();

};



new styleGuide();
