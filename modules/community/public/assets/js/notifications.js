// purpose:		shows or hides the notifications indicator in the header
// ************************************************************************


export function notifications(userSettings){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // module id (string)
  module.settings.id = userSettings?.id || 'notifications indicator';
  // do you want to enable debug mode that logs to console (bool)
  module.settings.debug = userSettings?.debug || false;
  // notifications endpoint url (string)
  module.settings.endpoint = userSettings?.endpoint || '/api/users/stats.json';
  // number of unread notifications (int)
  module.settings.notifications = 0;
  // number of unread messages (int)
  module.settings.messages = 0;
  // notifications indicator element (dom node)
  module.settings.notificationsIndicator = userSettings?.notificationsIndicator || document.querySelector('#pos-community-header-notifications .pos-community-header-indicator');
  // messages indicator element (dom node)
  module.settings.messagesIndicator = userSettings?.messagesIndicator || document.querySelector('#pos-community-header-messages .pos-community-header-indicator');
  


  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = async function(){
    // for now we are loading stats from the temporary endpoint
    if(!window.userInformation){
      await module.getStats();
    } else {
      pos.modules.debug(module.settings.debug, module.settings.id, `Unread notifications count already loaded from temporary "stats.json" endpoint. Got ${window.userInformation.inbox_unread} unread notifications.`, module.settings.indicator);

      module.settings.messages = window.userInformation.inbox_unread;
      document.dispatchEvent(new CustomEvent('pos-inboxUnreadUpdated', { bubbles: true, detail: { messages: module.settings.messages } }));
      pos.modules.debug(module.settings.debug, 'event', `pos-inboxUnreadUpdated`, { messages: module.settings.messages });

      module.settings.notifications = window.userInformation.notifications.unread_count;
      document.dispatchEvent(new CustomEvent('pos-inboxNotificationsUnreadUpdated', { bubbles: true, detail: { notifications: module.settings.notifications } }));
      pos.modules.debug(module.settings.debug, 'event', `pos-inboxNotificationsUnreadUpdated`, { notifications: module.settings.notifications });
    }
    module.updateIndicator();
  };

  
  // purpose:		get the stats from the endpoint
  // output:    updates module.settings.notifications with the stats
  // ------------------------------------------------------------------------
  module.getStats = async function(){
    pos.modules.debug(module.settings.debug, module.settings.id, 'Getting unread notifications count', module.settings.indicator);

    return fetch(module.settings.endpoint)
      .then(res => res.json())
      .then(stats => {
        pos.modules.debug(module.settings.debug, module.settings.id, `Got ${stats.notifications.unread_count} unread notifications`, module.settings.indicator);
        
        module.settings.messages = stats.inbox_unread;
        document.dispatchEvent(new CustomEvent('pos-inboxUnreadUpdated', { bubbles: true, detail: { messages: module.settings.messages } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-inboxUnreadUpdated`, { messages: module.settings.messages });

        module.settings.notifications = stats.notifications.unread_count;
        document.dispatchEvent(new CustomEvent('pos-inboxNotificationsUnreadUpdated', { bubbles: true, detail: { notifications: module.settings.notifications } }));
        pos.modules.debug(module.settings.debug, 'event', `pos-inboxNotificationsUnreadUpdated`, { notifications: module.settings.notifications });


        return { messages: module.settings.messages, notifications: module.settings.notifications }
      });
  };


  // purpose:		update the notifications indicator
  // output:    shows or hides the indicator based on the number of notifications
  // ------------------------------------------------------------------------
  module.updateIndicator = function(){
    if(module.settings.notifications > 0){
      module.settings.notificationsIndicator.classList.add('pos-community-header-indicator-active');
      module.settings.notificationsIndicator.textContent = module.settings.notifications > 9 ? '9+' : module.settings.notifications;
      pos.modules.debug(module.settings.debug, module.settings.id, 'Shown and updated unread notifications indicator', module.settings.notificationsIndicator);
    } else {
      module.settings.notificationsIndicator.classList.remove('pos-community-header-indicator-active');
      pos.modules.debug(module.settings.debug, module.settings.id, 'Hidden unread notifications indicator', module.settings.notificationsIndicator);
    }

    if(module.settings.messages > 0){
      module.settings.messagesIndicator.classList.add('pos-community-header-indicator-active');
      module.settings.messagesIndicator.textContent = module.settings.messages > 9 ? '9+' : module.settings.messages;
      pos.modules.debug(module.settings.debug, module.settings.id, 'Shown and updated unread messages indicator', module.settings.messagesIndicator);
    } else {
      module.settings.messagesIndicator.classList.remove('pos-community-header-indicator-active');
      pos.modules.debug(module.settings.debug, module.settings.id, 'Hidden unread messages indicator', module.settings.messagesIndicator);
    }
  };



  module.init();

};