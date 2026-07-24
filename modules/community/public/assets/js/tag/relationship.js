/*
  handles following and unfollowing tags
*/

// IS FOLLOWING UPDATEOWAĆ BO TEGO NIE ROBIE

export function tagRelationship(userSettings = {}){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // module id (string)
  module.settings.id = userSettings.id;
  // container on which a class will be toggled depending on the relationship status (dom node)
  module.settings.container = userSettings.container;
  // class name to add to the container after the module is initialized and the relationship status is set (string)
  module.settings.initializedClass = userSettings.initializedClass || 'pos-community-tag-relationship-initialized';
  // class name to add to the container when the user has an active relationship (string)
  module.settings.activeClass = userSettings.activeClass || 'pos-community-tag-relationship-active';
  // relationship type to change (string)
  module.settings.relationshipType = userSettings.relationshipType || 'followship:tag';
  // current user id (string)
  module.settings.currentUserId = pos.user.id || userSettings.currentUserId;
  // id of the tag you want to change the relationship with (string)
  module.settings.targetTagId = userSettings.targetTagId;
  // if the current user is following the target tag (bool or undefined)
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
    if(!module.settings.id){
      console.error('Tag relationship component lacks an ID, could not initialize', module.settings);
      return false;
    }

    // set the current relationship status with the target user if available
    // currently we are getting those from the 'stats.json' endpoint but it needs to be splitted to be more RESTful
    if(window.userInformation && module.settings.targetTagId){
      if(window.userInformation.relationships['followship:tag']){
        module.settings.isFollowing = window.userInformation?.relationships['followship:tag'].find(relationship => relationship.r_id === module.settings.targetTagId) ? true : false
      } else {
        module.settings.isFollowing = false;
      }
      // change the initial button state to reflect relationship status
      if(module.settings.isFollowing){
        module.setUiState('active');
        pos.modules.debug(module.settings.debug, module.settings.id, `Initialized relationship with tag ${module.settings.targetTagId}`);
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


  // purpose:		toggles the class on the container to mark it's active/inactive state
  // arguments: 'active' or 'inactive' container states (string)
  // ------------------------------------------------------------------------
  module.setUiState = state => {
    if(state === 'active'){
      if(module.settings.toggleButton){
        pos.modules.debug(module.settings.debug, module.settings.id, `Changing button state to active for tag ${module.settings.targetTagId}`, module.settings.toggleButton);
      }
      if(module.settings.container){
        pos.modules.debug(module.settings.debug, module.settings.id, `Adding a active class to container for tag ${module.settings.targetTagId}`, module.settings.container);
        module.settings.container?.classList.add(module.settings.activeClass);
      }
    }
    else if(state === 'inactive'){
      if(module.settings.container){
        pos.modules.debug(module.settings.debug, module.settings.id, `Removing the active class from container for tag ${module.settings.targetTagId}`, module.settings.container);
        module.settings.container?.classList.remove(module.settings.activeClass);
      }
      if(module.settings.toggleButton){
        pos.modules.debug(module.settings.debug, module.settings.id, `Changing button state to inactive for tag ${module.settings.targetTagId}`, module.settings.toggleButton);
      }
    }
  };
  

  // purpose:		follows a tag
  // arguments: tag id to follow (string or int)
  // ------------------------------------------------------------------------
  module.follow = async (targetTagId = module.settings.targetTagId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to follow tag ${targetTagId}`);

    const data = {
      l_id: module.settings.currentUserId.toString(),
      r_id: targetTagId.toString(),
      name: module.settings.relationshipType
    };

    // find all components that are related to this relationship and reflect their state
    pos.modules.active[module.settings.id].forEach(component => {
      component.setUiState('active');
      component.settings.isFollowing = true;
    });

    pos.modules.debug(module.settings.debug, module.settings.id, `Storing a new state (following) for tag ${targetTagId}`, module.settings.isFollowing);

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
        document.dispatchEvent(new CustomEvent('pos-community-tag-relationship', { bubbles: true, detail: { targetTagId: targetTagId, following: module.settings.isFollowing } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-tag-relationship`, { targetTagId: targetTagId, following: module.settings.isFollowing });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to set a relationship for tag ${targetTagId} passed, change stored in the database`, module.settings.container);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      // find all components that are related to this relationship and reflect their state
      pos.modules.active[module.settings.id].forEach(component => {
        component.setUiState('inactive');
        component.settings.isFollowing = false;
      });
      new pos.modules.toast('error', `Someting went wrong while trying to follow tag ${targetTagId}. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to set a relationship for tag ${targetTagId} failed`, module.settings.container);
      console.error(`Error following tag ${targetTagId}`, response);
    });
  };


  // purpose:		unfollows a tag
  // arguments: tag id to follow (string or int)
  // ------------------------------------------------------------------------
  module.unfollow = async (targetTagId = module.settings.targetTagId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to unfollow tag ${targetTagId}`);

    const data = {
      l_id: module.settings.currentUserId.toString(),
      r_id: targetTagId.toString(),
      name: module.settings.relationshipType
    }

    // find all components that are related to this relationship and reflect their state
    pos.modules.active[module.settings.id].forEach(component => {
      component.setUiState('inactive');
      component.settings.isFollowing = false;
    });

    pos.modules.debug(module.settings.debug, module.settings.id, `Storing a new state (not following) for tag ${targetTagId}`, module.settings.isFollowing);

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
        document.dispatchEvent(new CustomEvent('pos-community-tag-relationship', { bubbles: true, detail: { targetTagId: targetTagId, following: module.settings.isFollowing } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-community-tag-relationship`, { targetTagId: targetTagId, following: module.settings.isFollowing });
        pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove the relationship for tag ${targetTagId} passed, change stored in the database`, module.settings.container);
      } else {
        return Promise.reject(response);
      }
    }).catch(response => {
      // find all components that are related to this relationship and reflect their state
      pos.modules.active[module.settings.id].forEach(component => {
        component.setUiState('active');
        component.settings.isFollowing = true;
      });
      new pos.modules.toast('error', `Someting went wrong while trying to unfollow tag ${targetTagId}. Please refresh the page and try again.`);
      pos.modules.debug(module.settings.debug, module.settings.id, `Request to remove the relationship for user ${targetTagId} failed`, module.settings.container);
      console.error(`Error unfollowing tag ${targetTagId}`, response);
    });
  };


  // purpose:		follows a tag it it was not followed before or unfollows it otherwise
  // arguments: tag id to toggle following state on (string or int)
  // ------------------------------------------------------------------------
  module.toggle = async (targetTagId = module.settings.targetTagId) => {
    pos.modules.debug(module.settings.debug, module.settings.id, `Trying to toggle relationship with tag ${targetTagId}`, module.settings.toggleButton);

    if(module.settings.isFollowing !== undefined){
      if(module.settings.isFollowing){
        module.unfollow(targetTagId);
      } else {
        module.follow(targetTagId);
      }
    } else {
      console.error('The relationship status is not defined. We don\'t know if currently logged in user is following the target user so the relationship status can\'t be toggled.');
    }
  };


  module.init();

};