const componentModule = (elements) => {

  elements.forEach(selectComponentWrapper => {
    const placeholder = selectComponentWrapper.querySelector('.pos-select__placeholder');
    const opener = selectComponentWrapper.querySelector('.pos-select__opener');
    const popup = selectComponentWrapper.querySelector('.pos-select__popup');
    const filter = selectComponentWrapper.querySelector('.pos-select__filter');
    const options = selectComponentWrapper.querySelector('.pos-select__options');
    const head = selectComponentWrapper.querySelector('.pos-select__head');

    let optionHoveredIndex = -1;

    /* toggle open for custom select */
    const toggleOpen = (event) => {
      event.stopPropagation();
      popup.classList.toggle('hidden');
      popup.ariaHidden = popup.ariaHidden === 'true' ? 'false' : 'true';
      const openerIcons = selectComponentWrapper.querySelectorAll('.pos-select__opener > div');
      openerIcons[0].classList.toggle('hidden');
      openerIcons[1].classList.toggle('hidden');

      if(popup.ariaHidden === 'true' && filter){
        filterClear();
      }
    };

    const closeOptions = (event) => {
      event.stopPropagation();
      popup.classList.add('hidden');
      popup.ariaHidden = true;
      const openerIcons = selectComponentWrapper.querySelectorAll('.pos-select__opener > div');
      openerIcons[0].classList.remove('hidden');
      openerIcons[1].classList.add('hidden');
      updateCustomSelectHovered(-1);
      if(filter){
        filterClear();
      }
    };

    const watchClickOutside = (event) => {
      const didClickedOutside = !selectComponentWrapper.contains(event.target);
      if (didClickedOutside) {
        closeOptions(event);
      }
    };

    const updateCustomSelectHovered = (newIndex) => {
      const prevOption = options.children[optionHoveredIndex];
      const option = options.children[newIndex];

      if (prevOption) {
        prevOption.classList.remove('bg-highlighted');
      }
      if (option) {
        option.scrollIntoView({behavior: 'smooth', block: 'center'});
        option.classList.add('bg-highlighted');
      }

      optionHoveredIndex = newIndex;
    };

    const supportKeyboardNavigation = (event) => {
      // press down -> go next
      if (event.keyCode === 40 && optionHoveredIndex < options.querySelectorAll('.pos-select__option:not(.hidden)').length - 1) {
        event.preventDefault(); // prevent page scrolling
        updateCustomSelectHovered(optionHoveredIndex + 1);
      }

      // press up -> go previous
      if (event.keyCode === 38 && optionHoveredIndex > 0) {
        event.preventDefault(); // prevent page scrolling
        updateCustomSelectHovered(optionHoveredIndex - 1);
      } else if (event.keyCode === 38 && filter && optionHoveredIndex === 0){
        filter.focus();
      }

      // press Enter or space -> select the option
      if (event.keyCode === 13 || event.keyCode === 32) {
        // don't react if user focused the filtering input
        if(!document.activeElement.matches('input')){
          event.preventDefault();
          if (optionHoveredIndex == -1) {
            toggleOpen(event);
          } else {
            const checkbox = options.children[optionHoveredIndex].querySelector('[type="checkbox"]');
            if (checkbox) {
              checkbox.click();
            } else {
              options.children[optionHoveredIndex].click();
            }
          }
        }
      }

      // press ESC -> close selectCustom
      if (event.keyCode === 27) {
        closeOptions(event);
      }
    };

    head.addEventListener('click', toggleOpen);
    document.addEventListener('click', watchClickOutside);
    opener.addEventListener('click', toggleOpen);
    placeholder.addEventListener('click', toggleOpen);
    selectComponentWrapper.addEventListener('keydown', supportKeyboardNavigation);


    /* multiselect */
    const nativeMultiSelect = selectComponentWrapper.querySelector('.pos-select--multi-native');
    const counter = selectComponentWrapper.querySelector('.pos-select__tags_counter');

    if (nativeMultiSelect) {
      selectComponentWrapper.querySelectorAll('[type="checkbox"]').forEach(checkbox => {
        /* multi select - custom select*/
        checkbox.addEventListener('change', () => {
          const option = selectComponentWrapper.querySelector(`option[value="${checkbox.value}"]`);
          option.selected = !option.selected;

          const tag = selectComponentWrapper.querySelector(`[data-value="${checkbox.value}"]`);
          tag.classList.toggle('hidden');

          const checkedBoxes = selectComponentWrapper.querySelectorAll('[type="checkbox"]:checked');
          if (checkedBoxes.length) {
            placeholder.classList.add('hidden');
          } else {
            placeholder.classList.remove('hidden');
          }

          // update the counter for combined variant
          if(counter){
            if(checkedBoxes.length){
              counter.classList.remove('hidden');
            } else {
              counter.classList.add('hidden');
            }
            if(counter.children[0] && counter.children[0].children[0]){
              counter.children[0].children[0].textContent = checkedBoxes.length + counter.dataset.label;
            }
          }
        });
      });

      const tags = selectComponentWrapper.querySelectorAll('.pos-select__tags > div');
      tags.forEach(tag => {
        tag.addEventListener('click', (event) => {
          event.stopPropagation();
          const tagValue = tag.getAttribute('data-value');
          const checkbox = selectComponentWrapper.querySelector(`input[value="${tagValue}"]`);
          checkbox.click();
          const option = selectComponentWrapper.querySelector(`option[value="${tagValue}"]`);
          option.selected = false;
          tag.classList.add('hidden');
        });
      });

      /* multi select - native select*/
      nativeMultiSelect.addEventListener('change', () => {
        const selectedOptions = selectComponentWrapper.querySelectorAll('.pos-select--multi-native > option');

        selectedOptions.forEach(option => {
          const optionValue = option.value;
          const checkbox = selectComponentWrapper.querySelector(`input[value="${optionValue}"]`);
          const tag = selectComponentWrapper.querySelector(`[data-value="${optionValue}"]`);
          if (option.selected) {
            checkbox.checked = true;
            tag.classList.remove('hidden');
          } else {
            checkbox.checked = false;
            tag.classList.add('hidden');
          }
          const checkedBoxes = selectComponentWrapper.querySelectorAll('[type="checkbox"]:checked');
          if (checkedBoxes.length) {
            placeholder.classList.add('hidden');
          } else {
            placeholder.classList.remove('hidden');
          }
        });
      });
    }

    /* single select */
    const nativeSelect = selectComponentWrapper.querySelector('.pos-select--simple-native');
    if (nativeSelect) {
      const tagWrapper = selectComponentWrapper.querySelector('.pos-select__tags');
      tagWrapper.addEventListener('click', toggleOpen);
      const singleSelectTagSelect = () => {
        const tags = selectComponentWrapper.querySelectorAll('.pos-select__tags > div');
        tags.forEach(tag => {
          const tagValue = tag.getAttribute('data-value');
          if (tagValue == nativeSelect.value) {
            tag.classList.remove('hidden');
          } else {
            tag.classList.add('hidden');
          }
        });

        const options = selectComponentWrapper.querySelectorAll('.pos-select__option');
        options.forEach(option => {
          const optionValue = option.getAttribute('data-value');
          if (optionValue == nativeSelect.value) {
            option.classList.add('bg-highlighted');
          } else {
            option.classList.remove('bg-highlighted');
          }
        });

        if (nativeSelect.value) {
          placeholder.classList.add('hidden');
        } else {
          placeholder.classList.remove('hidden');
        }
      };

      /* single select - custom select*/
      selectComponentWrapper.querySelectorAll('.pos-select__option').forEach(option => {
        const value = option.getAttribute('data-value');
        option.addEventListener('click', (event) => {
          nativeSelect.value = value;
          const changeevent = new Event('change');
          nativeSelect.dispatchEvent(changeevent);
          toggleOpen(event);
          singleSelectTagSelect();
        });
      });

      /* single select - native select*/
      nativeSelect.addEventListener('change', () => {
        singleSelectTagSelect();
      });
    };

    /* filtering the options list */
    const filterClear = () => {
      filter.value = '';

      const optionsHidden = selectComponentWrapper.querySelectorAll('.pos-select__option.hidden');

      optionsHidden.forEach(option => {
        option.classList.remove('hidden');
      });
    };

    if(filter){
      const optionsAvailable = selectComponentWrapper.querySelectorAll('.pos-select__option');

      filter.addEventListener('keyup', (event) => {
        if(event.key === 'ArrowDown'){
          event.preventDefault();
          head.focus();
        }

        optionsAvailable.forEach(option => {
          if(option.textContent.toLowerCase().trim().includes(event.target.value.toLowerCase().trim())){
            option.classList.remove('hidden');
          } else {
            option.classList.add('hidden');
          }
        });
      });
    };


  });

};

export default componentModule;
