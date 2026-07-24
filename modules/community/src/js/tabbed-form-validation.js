import { $q, $qa } from './modules/qs';

export default class tabbedFormValidation {
  constructor(form) {
    this.form = form;
    this.submitButton = $q('button[type="submit"]', form);
    this.tabs = $qa('[data-tabbed-form-tabs]', form);
    this.validate = this.validate.bind(this);
    this.init();
  }

  init() {
    this.submitButton.addEventListener('click', (e) => {
      if (!this.form.reportValidity()) {
        e.preventDefault();
        this.validate();
      }
    });
  }

  validate() {
    // iterate through the tabbed sections in the form
    for (const tabSection of this.tabs) {
      const tabs = $qa('[data-tabbed-form-tab]', tabSection);
      if (!tabs.length) return;
      // iterate through the tab contents in a tabbed section
      for (const tab of tabs) {
        const invalidElement = $q(':invalid', tab);
        if (!invalidElement) continue;

        const handle = $q(`[data-tabbed-form-tab-handle="${tab.dataset.tabbedFormTab}"]`, tabSection);
        if (!handle) continue;
        // if there is an invalid input in the tab content then switch to the invalid tab. Alpine handles the click event
        handle.click();
        break;
      }
    }
    // delegate to the async queue so Alpine can switch to the invalid tab
    setTimeout(() => {
      // revalidate the form
      if (this.form.reportValidity()) {
        // and submit if the form is valid
        this.form.submit();
      }
    });
  }
}
