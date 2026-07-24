window.searchComponent = function () {
  return {
    spinner: false,
    frame: null,
    isSidebarOpen: false,
    isSellersExpanded: false,
    init(){
      this.watchScreen();
      this.handleBack();
    },
    bigScreen() {
      return window.innerWidth >= 1024;
    },
    watchScreen() {
      this.isSidebarOpen = this.bigScreen();
    },
    render(res){
       this.$refs.main.innerHTML = res;
    },
    reset(){
      let filters = document.querySelector('[x-ref="sidebar"]');

      filters.querySelectorAll('select').forEach(item => { item.selectedIndex = '0'; });
      filters.querySelectorAll('input:not([type="checkbox"])').forEach(item => { item.value = ''; });
      filters.querySelectorAll('input[type="checkbox"]').forEach(item => { item.checked = false; item.dispatchEvent(new Event('change')); });

      this.submitSearch();
    },
    handleBack(){
      window.addEventListener('popstate', (event) => {
        this.spinner = true;
        window.location = document.location;
        return event;
      });
    },
    updateUrl(params) {
      let newUrl = new URL(window.location.href);
      newUrl.pathname = window.location.pathname;
      newUrl.search = params;
      history.pushState({}, null, newUrl.toString());
    },
    fetchResults(path) {
      fetch(path)
        .then((res) => res.text())
        .then((res) => {
          this.spinner = false;
          this.render(res);
        });
    },
    submitSearch() {
      this.spinner = true;
      let formData = new FormData(document.forms.search_form);
      let params = new URLSearchParams(formData);
      this.updateUrl(params);
      this.fetchResults('/search_frame?' + params.toString());
    },
    toggleSidebar(){
      this.$refs.sidebar.classList.toggle('hidden');
      this.$refs.overlay.classList.toggle('hidden');
    }
  };
};
