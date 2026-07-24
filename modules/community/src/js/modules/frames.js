window.frames = function () {
  return {
    frame: null,
    spinner: false,
    upload: false,
    error: false,

    async insert({ target, where }) {
      const selector = `[x-frames-target="${target}"]`;
      const targetEl = document.querySelector(`[x-frames-target="${target}"]`);

      let res = await this.submit();
      if (res)
        targetEl.insertAdjacentHTML(where, this.frame);
      window.posComponents.initialize();
      window.dispatchEvent(new CustomEvent("frame-rendered", { detail: { scope: selector } }));
    },

    async replace({ target }) {
      const selector = `[x-frames-target="${target}"]`;
      const targetEl = document.querySelector(`[x-frames-target="${target}"]`);

      let res = await this.submit();
      if (res)
        targetEl.innerHTML = this.frame;
      window.posComponents.initialize();
      window.dispatchEvent(new CustomEvent("frame-rendered", { detail: { scope: selector } }));
    },

    async send(path, method, data) {
      const options = { method: method };
      if (method.toLowerCase() === 'post') {
        options.body = data;
      } else {
        path += '?' + (new URLSearchParams(data)).toString();
      }
      const response = await fetch(path, options);
      const text = await response.text();
      if (response.ok) {
        this.frame = text;
      } else {
        this.error = text;
      }
      this.spinner = false;
      return response.ok;
    },

    async submit() {
      this.spinner = true;
      this.error = false;
      const form = this.$refs.form;
      let formData = new FormData(form);
      const refs = this.$refs;
      if (refs.form.checkValidity()) {
        let url = form.action;
        if (!url.includes('frame')) url = `${url}.frame`;
        let res = await this.send(url, form.method, formData);
        if (res) {
          if (form.method.toUpperCase() === 'POST') refs.form.reset();
        } else {
          new posComponents.flash('error', this.error);
        }

        return res;
      }
    }
  };
};
