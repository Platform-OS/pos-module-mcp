/*
  handles list filtering
*/


// purpose:		handles list filtering
// ************************************************************************
window.listFiltered = {

  // if the loading spinner is active (bool)
  loading: false,
  // selected stateuses to show (array)
  status: [],
  // the URL that the request should go to (string)
  url: null,
  // the current page
  page: 1,


  // purpose:		requests the content of the orders list
  // returns:   applies the return content to html
  // ------------------------------------------------------------------------
  filter(){
    this.loading = true;
    this.page = 1;

    let params = `status=${this.status}&page=${this.page}`;

    fetch(`${this.url}?${params}`)
      .then((response) => response.text())
      .then((response) => {
        document.querySelector('[data-list-filtered-frame]').innerHTML = response;
        this.loading = false;

        this.updateUrl(params);
      });
  },


  // purpose:		updates the browser URL
  // argumens:  the params string (string)
  // ------------------------------------------------------------------------
  updateUrl(params){
    let url = new URL(window.location.href);
    params = new URLSearchParams(params);

    url.search = params;
    history.pushState({}, null, url.toString());
  }

};
