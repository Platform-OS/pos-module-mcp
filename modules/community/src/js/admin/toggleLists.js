/*
  toggles all the checkboxes on the filters lists
*/



// purpose:		toggles the checkboxes
// arguments: the list that you want to toggle the checkboxes on (dom node)
// returns:   true if all the checkboxes were selected or false if not (bool)
// ************************************************************************
api.toggleList = function(list){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // the list you want to toggle (dom node)
  module.settings.container = list;


  module.init = () => {
    if(module.settings.container.querySelectorAll('[type="checkbox"]:not(:checked)').length){
      return module.check();
    } else {
      return module.uncheck();
    }
  };

  module.uncheck = () => {
    module.settings.container.querySelectorAll('[type="checkbox"]').forEach((item) => {
      item.checked = false;
    });

    return false;
  };

  module.check = () => {
    module.settings.container.querySelectorAll('[type="checkbox"]').forEach((item) => {
      item.checked = true;
    });

    return true;
  };


  return module.init();

};
