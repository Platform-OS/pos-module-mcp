window.charCounter = function () {
  return {
    count: 0,
    charsLeft: 0,
    init(){
      this.count = this.$refs.content.value.length;
      this.charsLeft = this.$refs.content.maxLength - this.count;
    },
    input: {
      ['x-on:keyup'](){
        this.count = this.$refs.content.value.length;
        this.charsLeft = this.$refs.content.maxLength - this.count;
      }
    }
  };
};
