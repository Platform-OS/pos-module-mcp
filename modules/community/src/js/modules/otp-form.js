window.otpForm = function (){
  return {
    length: 6,
    value: "",

    handleInput(e) {
      const input = e.target;

      this.value = Array.from(Array(this.length), (_element, i) => {
        return this.$refs[i].value || "";
      }).join("");

      if (input.nextElementSibling && input.value) {
        input.nextElementSibling.focus();
        input.nextElementSibling.select();
      }
      this.$nextTick(() => this.submitOnLastInput(input));
    },

    submitOnLastInput(input) {
      if (input.attributes['x-ref'].value == (this.length - 1).toString()) input.form.submit();
    },

    handlePaste(e) {
      const paste = e.clipboardData.getData('text');
      this.value = paste;

      for (let i=0; i < this.length; i++){
        this.$refs[i].value = paste[i] || '';
      }
      this.$nextTick(() => this.$refs[this.length - 1].form.submit());
    },

    handleBackspace(e) {
      const previous = parseInt(e, 10) - 1;
      this.$refs[previous] && this.$refs[previous].focus();
    },
  };
};
