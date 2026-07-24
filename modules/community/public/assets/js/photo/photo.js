/*
  handles adding, removing of photos
*/

const create = function({ url, type, width, height, objectUuid }, userSettings = {}){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};

  // endpoint for creating a photo (string)
  module.settings.createUrl = '/api/photos';
  // if the debug mode should log debug data to console (bool)
  module.settings.debug = userSettings.debug || false;


  // purpose:		sends an api request to create a photo
  // ------------------------------------------------------------------------
  module.init = () => {

    const data = {
      direct_url: url,
      photo_type: type,
      object_uuid: objectUuid,
      photo_width: width,
      photo_height: height
    };

    fetch(module.settings.createUrl, {
      method: 'POST',
      body: JSON.stringify({ photo: { ...data } }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        "X-CSRF-Token": pos.csrfToken
      }
    }).then(response => {
      if(response.ok){
        document.dispatchEvent(new CustomEvent('pos-community-photo-created', { bubbles: true, detail: { url, type, width, height } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-photo-created`, { url, type, width, height });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to save a photo data passed, stored in the database`);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      new pos.modules.toast('error', `Someting went wrong while trying to save photo data in the database. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to save a photo data failed`, url);
      console.error(`Request to save a photo data failed`, response);
    });
  };

  module.init();

};


const remove = function({ id }, userSettings = {}){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};

  // endpoint for removing a photo (string)
  module.settings.removeUrl = '/api/photos';
  // if the debug mode should log debug data to console (bool)
  module.settings.debug = userSettings.debug || false;


  // purpose:		sends an api request to remove a photo
  // ------------------------------------------------------------------------
  module.init = () => {

    const data = {
      id: id
    };

    fetch(module.settings.removeUrl, {
      method: 'DELETE',
      body: JSON.stringify({ photo: { ...data } }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        "X-CSRF-Token": pos.csrfToken
      }
    }).then(response => {
      if(response.ok){
        document.dispatchEvent(new CustomEvent('pos-community-photo-removed', { bubbles: true, detail: { id } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-photo-removed`, { id });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove a photo data from the database passed`);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      new pos.modules.toast('error', `Someting went wrong while trying to remove photo data from the database. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove a photo data failed`, url);
      console.error(`Request to remove a photo data failed`, response);
    });
  };

  module.init();
 
};



export const photo = {

  create,
  remove

};