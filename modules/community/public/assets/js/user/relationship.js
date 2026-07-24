/*
  handles following and unfollowing users
*/

if(!pos.modules.user){
  pos.modules.user = {};
}

window.pos.modules.user.relationship = function(userSettings = {}){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // module id (string)
  module.settings.id = userSettings.id || `user-relationship`
  // container on which a class will be toggled depending on the relationship status (dom node)
  module.settings.container = userSettings.container;
  // class name to add to the container after the module is initialized and the relationship status is set (string)
  module.settings.initializedClass = userSettings.initializedClass || 'pos-community-user-relationship-initialized';
  // class name to add to the container when the user has an active relationship (string)
  module.settings.activeClass = userSettings.activeClass || 'pos-community-user-relationship-active';
  // relationship type to change (string)
  module.settings.relationshipType = userSettings.relationshipType || 'followship:profile';
  // current user id (string)
  module.settings.currentUserId = pos.user.id || userSettings.currentUserId;
  // id of the user you want to change the relationship with (string)
  module.settings.targetUserId = userSettings.targetUserId;
  // if the current user is following the target user (bool or undefined)
  module.settings.isFollowing = undefined;
  // endpoint for following (string)
  module.settings.followUrl = '/api/relationships/create.json';
  // endpoint for unfollowing (string)
  module.settings.unfollowUrl = '/api/relationships/delete.json';
  // toggle button elements, if exists (dom node or array of dom nodes)
  module.settings.toggleButton = userSettings.toggleButton;
  // if the debug mode should log debug data to console (bool)
  module.settings.debug = userSettings.debug || false;


  // purpose:		finds if the target user is already followed and sets the initial state, initializes event listeners
  // ------------------------------------------------------------------------
  module.init = () => {
    // set the current relationship status with the target user if available
    // currently we are getting those from the 'stats.json' endpoint but it needs to be splitted to be more RESTful
    if(window.userInformation && module.settings.targetUserId){
      if(window.userInformation.relationships['followship:profile']){
        module.settings.isFollowing = window.userInformation?.relationships['followship:profile'].find(relationship => relationship.r_id === module.settings.targetUserId) ? true : false
      } else {
        module.settings.isFollowing = false;
      }
      // change the initial button state to reflect relationship status
      if(module.settings.isFollowing){
        module.setUiState('active');
        pos.modules.debug(module.settings.debug, module.settings.id, `Initialized relationship with user ${module.settings.targetUserId}`);
      }

    }
    
    // react to toggle button clicks
    if(module.settings.toggleButton){
      module.settings.toggleButton.forEach(button => {
        button.addEventListener('click', event => {
          event.preventDefault();
          
          module.toggle();
        });
      })
    }

    module.settings.container?.classList.add(module.settings.initializedClass);
  };


  module.setUiState = state => {
    if(state === 'active'){
      if(module.settings.toggleButton){
        pos.modules.debug(module.settings.debug, module.settings.id, `Changing button state to active for user ${module.settings.targetUserId}`, module.settings.toggleButton);
      }
      if(module.settings.container){
        pos.modules.debug(module.settings.debug, module.settings.id, `Adding a active class to container for user ${module.settings.targetUserId}`, module.settings.container);
        module.settings.container?.classList.add(module.settings.activeClass);
      }
    }
    else if(state === 'inactive'){
      if(module.settings.container){
        pos.modules.debug(module.settings.debug, module.settings.id, `Removing the active class from container for user ${module.settings.targetUserId}`, module.settings.container);
        module.settings.container?.classList.remove(module.settings.activeClass);
      }
      if(module.settings.toggleButton){
        pos.modules.debug(module.settings.debug, module.settings.id, `Changing button state to inactive for user ${module.settings.targetUserId}`, module.settings.toggleButton);
      }
    }
  };
  

  module.follow = async (targetUserId = module.settings.targetUserId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to follow user ${targetUserId}`);

    const data = {
      l_id: module.settings.currentUserId.toString(),
      r_id: targetUserId.toString(),
      name: module.settings.relationshipType
    };

    module.setUiState('active');

    pos.modules.debug(module.settings.debug, module.settings.id, `Storing a new state (following) for user ${targetUserId}`, module.settings.isFollowing);
    module.settings.isFollowing = true;

    fetch(module.settings.followUrl, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        "X-CSRF-Token": pos.csrfToken
      }
    }).then(response => {
      if(response.ok){
        document.dispatchEvent(new CustomEvent('pos-community-user-relationship', { bubbles: true, detail: { targetUserId: targetUserId, following: module.settings.isFollowing } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-user-relationship`, { targetUserId: targetUserId, following: module.settings.isFollowing });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to set a relationship for user ${targetUserId} passed, change stored in the database`, module.settings.container);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      module.setUiState('inactive');
      new pos.modules.toast('error', `Someting went wrong while trying to follow user ${targetUserId}. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to set a relationship for user ${targetUserId} failed`, module.settings.container);
      console.error(`Error following user ${targetUserId}`, response);
    });
  };

  module.unfollow = async (targetUserId = module.settings.targetUserId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to unfollow user ${targetUserId}`);

    const data = {
      l_id: module.settings.currentUserId.toString(),
      r_id: targetUserId.toString(),
      name: module.settings.relationshipType
    }

    module.setUiState('inactive');

    pos.modules.debug(module.settings.debug, module.settings.id, `Storing a new state (not following) for user ${targetUserId}`, module.settings.isFollowing);
    module.settings.isFollowing = false;

    fetch(module.settings.unfollowUrl, {
      method: 'DELETE',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        "X-CSRF-Token": pos.csrfToken
      }
    }).then(response => {
      if(response.ok){
        document.dispatchEvent(new CustomEvent('pos-community-user-relationship', { bubbles: true, detail: { targetUserId: targetUserId, following: module.settings.isFollowing } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-user-relationship`, { targetUserId: targetUserId, following: module.settings.isFollowing });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove the relationship for user ${targetUserId} passed, change stored in the database`, module.settings.container);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      module.setUiState('active');
      new pos.modules.toast('error', `Someting went wrong while trying to unfollow user ${targetUserId}. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove the relationship for user ${targetUserId} failed`, module.settings.container);
      console.error(`Error unfollowing user ${targetUserId}`, response);
    });
  };

  module.toggle = async (targetUserId = module.settings.targetUserId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to toggle relationship with user ${targetUserId}`, module.settings.toggleButton);

    if(module.settings.isFollowing !== undefined){
      if(module.settings.isFollowing){
        module.unfollow(targetUserId);
      } else {
        module.follow(targetUserId);
      }
    } else {
      console.error('The relationship status is not defined. We don\'t know if currently logged in user is following the target user so the relationship status can\'t be toggled.');
    }
  };


  module.init();

};


/*

  - animating the button
  - testing if the api works without the button

*/