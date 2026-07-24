window.selectMultiple = function ({selectElement}) {
  return {
    selectElement: selectElement,
    options: [],
    filter: '',
    show: false,
    open() { this.show = true; },
    close() { this.show = false; },
    select(index) {
      if (!this.options[index].selected) {
        this.options[index].selected = true;
      } else {
        this.options[index].selected = false;
      }
      this.storeOptions();
    },
    remove(option) {
      this.options.find(el => el.value == option.value).selected = false;
      this.storeOptions();
    },
    loadOptions() {
      const options = this.selectElement.options;
      this.options = [];
      for (let i = 0; i < options.length; i++) {
        this.options.push({
          value: options[i].value,
          text: options[i].innerText,
          selected: options[i].getAttribute('selected') != null ? options[i].getAttribute('selected') : false
        });
      }
    },
    storeOptions() {
      this.options.forEach((option) => {
        selectElement.querySelector(`[value="${option.value}"]`).selected = option.selected;
      });
      selectElement.dispatchEvent(new Event('change'));
    },
    selectedValues(){
      return this.selected().map(option => this.options[option].value);
    },
    selected(){
      return this.options.filter(option => option.selected);
    }
  };
};
