/*
  handles posting on feed (both posts and comments)
*/

window.pos.modules.feed.create = function(settings){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // editor container (dom node)
  module.settings.container = settings.container;
  // unique module id (string)
  module.settings.id = settings.id || 'pos-community-feed-create';
  // new post toggle selector (string)
  module.settings.createToggle = settings.createToggleSelector || '.pos-community-feed-create-activate';
  // class toggled on the new post node to switch between active state (string)
  module.settings.createActiveClass = 'pos-community-feed-create-active';
  // close new post box selector (string)
  module.settings.createCloseSelector = settings.createCloseSelector || '.pos-community-feed-create-close';
  // active module associated with the new post box (object)
  module.settings.editor = pos.modules.active[module.settings.id + '-editor'] || null;
  // new post form (dom node)
  module.settings.form = settings.form || module.settings.container.querySelector('form');
  // container to put response html in the dom (dom node)
  module.settings.responseTarget = settings.responseTarget;
  // where to put the response html in the container ('start', 'end' or 'replace')
  module.settings.responseTargetPlace = settings.responseTargetPlace;
  // class that will be added to newly posted content container (string)
  module.settings.createClass = 'pos-community-feed-fresh';
  // corresponding post id (string)
  module.settings.postId = settings.postId;

  // debug mode enabled (bool)
  module.settings.debug = settings.debug || false;


  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    pos.modules.debug(module.settings.debug, module.settings.id, 'Initializing feed create box', module.settings);

    // create content editor if none assigned (for newly added commenting form)
    if(!module.settings.editor){
      const editorId = `pos-community-post-${module.settings.postId}-comment-create-editor`;
      const markdownContainer = module.settings.container.querySelector(`#${editorId}`);

      // activate the @mention popover if it wasn't picked up on page load (e.g. right after a post got created via AJAX)
      const mentionPopoverContainer = markdownContainer.querySelector('.pos-popover');
      if(mentionPopoverContainer && !pos.modules.active[`${editorId}-mention-popover`]){
        pos.modules.active[`${editorId}-mention-popover`] = new pos.modules.popover(mentionPopoverContainer);
      }

      module.settings.editor = pos.modules.active[editorId] = new pos.modules.markdown({
        container: markdownContainer,
        id: editorId
      });
    }

    module.settings.container.querySelector(module.settings.createToggle).addEventListener('click', () => {
      module.expandEditor();
    });

    module.settings.container.querySelector(module.settings.createCloseSelector).addEventListener('click', () => {
      module.hideEditor();
    });

    module.settings.container.querySelector(module.settings.createToggle).disabled = false;

    module.settings.form.addEventListener('submit', event => event.preventDefault());
    module.settings.form.addEventListener('pos-markdown-validation-passed', module.submit);

    // remove the return_to value to get the response html fragment
    if(module.settings.responseTarget){
      module.settings.form.querySelector('[name="return_to"]')?.remove();
    }

    // highlight code
    module.settings.container.addEventListener('pos-community-feed-create-posted', async event => {
      if(!pos.modules.code){
        await import('modules/common-styling/js/pos-code.js');
      }
      event.detail.container.querySelectorAll('pre code').forEach((element, index) => {
        pos.modules.active[`pos-code-post-${event.detail.postId}-comment-${event.detail.commentId}-${index}`] = new pos.modules.code({
          container: element,
          id: `pos-code-post-${event.detail.postId}-comment-${event.detail.commentId}-${index}`
        });
      });
    });
  };


  // purpose:		expands the new post box
  // ------------------------------------------------------------------------
  module.expandEditor = () => {
    pos.modules.debug(module.settings.debug, module.settings.id, 'Activating feed create box', module.settings.container);

    const focusableElements = module.settings.container.querySelector('input[type="text"], input[type="email"], input[type="url"], textarea:not(.pos-markdown textarea)');

    module.settings.container.addEventListener('transitionend', () => {
      module.settings.editor.refresh();
      // focus the first input in the form, if any, otherwise focus the editor
      if(focusableElements){
        focusableElements.focus();
      } else {
        module.settings.editor.focus();
      }
      
      // dispatch custom event
      module.settings.container.dispatchEvent(new CustomEvent('pos-community-feed-create-active', { bubbles: true, detail: { target: module.settings.container, id: module.settings.id } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-feed-create-active', { target: module.settings.container, id: module.settings.id });
    }, { once: true });
    
    module.settings.container.classList.add(module.settings.createActiveClass);
    
    module.settings.editor.refresh();
    if(focusableElements){
      focusableElements.focus();
    } else {
      module.settings.editor.focus();
    }
  };


  // purpose:		hides the new post box
  // ------------------------------------------------------------------------
  module.hideEditor = () => {
    pos.modules.debug(module.settings.debug, module.settings.id, 'Disabling feed create box', module.settings.container);

    module.settings.editor.reset();

    module.settings.container.classList.remove(module.settings.createActiveClass);

    module.settings.container.addEventListener('transitionend', () => {
      // dispatch custom event
      module.settings.container.dispatchEvent(new CustomEvent('pos-community-feed-create-disabled', { bubbles: true, detail: { target: module.settings.container, id: module.settings.id } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-feed-create-disabled', { target: module.settings.container, id: module.settings.id });
    }, { once: true });
  };


  // purpose:		submitting the form
  // ------------------------------------------------------------------------
  module.submit = event => {
    event.preventDefault();

    // synchronize the changes from markdown editor to the textarea
    module.settings.editor.updateTextarea();

    const type = module.settings.form.querySelector('[name^="comment"]') ? 'comment' : 'post';

    // dispatch custom event
    module.settings.container.dispatchEvent(new CustomEvent('pos-community-feed-create-submit', { bubbles: true, detail: { target: module.settings.container, id: module.settings.id, content: module.settings.editor.value(), type: type } }));
    pos.modules.debug(module.settings.debug, 'event', 'pos-community-feed-create-submit', { target: module.settings.container, id: module.settings.id, content: module.settings.editor.value(), type: type });

    if(module.settings.responseTarget){
      fetch(module.settings.form.action, {
        method: module.settings.form.method,
        body: new FormData(module.settings.form)
      })
      .then(response => response.text())
      .then(html => {
        const container = ((document.createRange()).createContextualFragment(html)).firstElementChild;
        container.classList.add(module.settings.createClass);

        if(module.settings.responseTargetPlace === 'end'){
          module.settings.responseTarget.append(container);
        }
        else if(module.settings.responseTargetPlace === 'start'){
          module.settings.responseTarget.prepend(container);
        }
        else if(module.settings.responseTargetPlace === 'replace'){
          module.settings.responseTarget.replaceWith(container);
        }

        const postId = container.dataset.postId;
        const commentId = container.dataset.commentId;

        module.settings.container.dispatchEvent(new CustomEvent('pos-community-feed-create-posted', { bubbles: true, detail: { target: module.settings.container, id: module.settings.id, container, type, postId, commentId } }));
        pos.modules.debug(module.settings.debug, 'event', 'pos-community-feed-create-posted', { target: module.settings.container, id: module.settings.id, container, type, postId, commentId });
      });
    }

    // reset editor state
    module.settings.form.reset();
    module.settings.editor.reset();
    module.hideEditor();

    // generate new UUID for next post/comment
    module.settings.form.querySelector('input[name*="[uuid]"]').value = self.crypto.randomUUID();

  };


  module.init();

};