/*
  handles comments to post on feed
*/

window.pos.modules.feed.comment = function(settings){

  // cache 'this' value not to be overwritten later
  const module = this;


  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // editor container (dom node)
  module.settings.container = settings.container;
  // unique module id (string)
  module.settings.id = settings.id;
  // parent post id (string)
  module.settings.postId = settings.postId;
  // existing comment id (string)
  module.settings.commentId = settings.commentId || false;

  // text content of the comment (dom node)
  module.settings.contentNode = settings.contentNode || module.settings.container.querySelector('.pos-community-post-comment-content');

  // edit form
  module.settings.editForm = module.settings.editForm || module.settings.container.querySelector('form');
  if(module.settings.editForm){
    // class added to the contaier when in editing mode (string)
    module.settings.editActiveClass = 'pos-community-post-comment-editing';
    // endpoint path for editing a comment (string)
    module.settings.editEdpoint = settings.editEdpoint || '/api/comments';
    // commend edit button (dom node)
    module.settings.editButton = settings.editButton || module.settings.container.querySelector('.pos-community-post-comment-menu-edit');
    // markdown editor instance (object)
    module.settings.editor = settings.editor || pos.modules.active[`pos-community-post-${module.settings.postId}-comment-${module.settings.commentId}-editor`]
    // button that cancels editing (dom node)
    module.settings.editCancel = settings.editCancel || module.settings.container.querySelector('.pos-community-post-comment-edit-close');
    // initial comment content (string)
    module.settings.initialContent = module.settings.editForm.querySelector('[name="comment[body]"]').value;
  }

  // comment delete button (DOM node)
  module.settings.deleteButton = settings.deleteButton || module.settings.container.querySelector('.pos-community-post-comment-menu-delete');
  if(module.settings.deleteButton){
    // endpoint path for deleting a comment (string)
    module.settings.deleteEndpoint = settings.deleteEndpoint || '/api/comments';
    // confirmation message when deleting a comment
    module.settings.deleteConfirmationMessage = settings.deleteConfirmationMessage || module.settings.deleteButton.dataset.confirmationMessage;
  }

  // debug mode enabled (bool)
  module.settings.debug = settings.debug || false;



  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    pos.modules.debug(module.settings.debug, module.settings.id, 'Initializing comment module', module.settings);

    // create content editor if none assigned (for newly added comment nodes)
    if(module.settings.editForm && !module.settings.editor){
      const editorId = `pos-community-post-${module.settings.postId}-comment-${module.settings.commentId}-editor`;
      const markdownContainer = module.settings.container.querySelector(`#pos-community-post-${module.settings.postId}-comment-${module.settings.commentId}-edit .pos-markdown`);

      // activate the @mention popover if it wasn't picked up on page load (e.g. right after posting a comment via AJAX)
      const mentionPopoverContainer = markdownContainer.querySelector('.pos-popover');
      if(mentionPopoverContainer && !pos.modules.active[`${editorId}-mention-popover`]){
        pos.modules.active[`${editorId}-mention-popover`] = new pos.modules.popover(mentionPopoverContainer);
      }

      module.settings.editor = pos.modules.active[editorId] = new pos.modules.markdown({
        container: markdownContainer,
        id: editorId,
        content: module.settings.editForm.querySelector('[name="comment[body]"]').value
      });
    }

    // highlight code
    if(module.settings.editForm){
      module.settings.container.addEventListener('pos-community-post-comment-editor-saved', async () => {
        if(!pos.modules.code){
          await import('modules/common-styling/js/pos-code.js');
        }
        module.settings.contentNode.querySelectorAll('pre code').forEach((element, index) => {
          pos.modules.active[`pos-code-post-${module.settings.postId}-comment-${module.settings.commentId}-${index}`] = new pos.modules.code({
            container: element,
            id: `pos-code-post-${module.settings.postId}-comment-${module.settings.commentId}-${index}`
          });
        });
      });
    }

    // edit comment
    if(module.settings.editForm){
      if(module.settings.commentId){
        module.settings.editButton.addEventListener('click', () => {
          module.showEditor();
        });
        module.settings.editCancel.addEventListener('click', () => {
          module.closeEditor();
          // bring back the initial value
          module.settings.editor.value(module.settings.editor.settings.textarea.value);
        })
        module.settings.editForm.addEventListener('submit', event => event.preventDefault());
        module.settings.container.addEventListener('pos-markdown-validation-passed', module.save);
      }
    }

    // delete commment
    if(module.settings.deleteButton){
      if(module.settings.commentId){
        module.settings.deleteButton.addEventListener('click', () => {
          if(window.confirm(module.settings.deleteConfirmationMessage)){
            module.delete();
          }
        });
      }
    }
  };


  // purpose:		shows comment editor
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.showEditor = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Showing comment editor', { commentId: module.settings.commentId, editor: module.settings.editor });
      
      module.settings.container.classList.add(module.settings.editActiveClass);

      module.settings.editor.refresh();
      module.settings.editor.focus();

      module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-comment-editor-opened', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-comment-editor-opened', { target: module.settings.container, editor: module.settings.editor });
    };
  }


  // purpose:		hides comment editor
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.closeEditor = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Hidding comment editor', { commentId: module.settings.commentId, editor: module.settings.editor });
      
      // remove active class
      module.settings.container.classList.remove(module.settings.editActiveClass);
      // clean up the editor
      module.settings.editor.reset();
      module.settings.editor.value(module.settings.initialContent);

      module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-comment-editor-closed', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-comment-editor-closed', { target: module.settings.container, editor: module.settings.editor });
    };
  }
  
  // purpose:		save edited comment
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.save = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Saving comment edits…', { commentId: module.settings.commentId, editor: module.settings.editor });
    
      fetch(module.settings.editEdpoint, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': pos.csrfToken
        },
        body: JSON.stringify(Object.fromEntries(new FormData(module.settings.editForm)))
      })
      .then(response => response.json())
      .then(data => {
        if(data.errors){
          pos.modules.debug(module.settings.debug, module.settings.id, 'Error while saving comment edits', { data: data, commentId: module.settings.commentId });
          new pos.modules.toast('error', `Could not save edits for comment ${module.settings.commentId}. Please reload the page and try again.`);
        } else {
          module.settings.contentNode.innerHTML = data.comment_body;
          module.settings.initialContent = module.settings.editor.value();

          module.closeEditor();

          pos.modules.debug(module.settings.debug, module.settings.id, 'Saved comment edits and updated the view', { commentId: module.settings.commentId, content: data.comment_body });

          module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-comment-editor-saved', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor, content: data } }));
          pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-comment-editor-saved', { target: module.settings.container, editor: module.settings.editor, content: data });
        }
      });
    };
  }


  // purpose:		deleting an existing comment
  // ------------------------------------------------------------------------
  if(module.settings.deleteButton){
    module.delete = () => {

      pos.modules.debug(module.settings.debug, module.settings.id, 'Attempting to delete comment', module.settings.commentId);

      fetch(module.settings.deleteEndpoint, {
          method: 'delete',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': pos.csrfToken
          },
          body: JSON.stringify({ comment: { id: module.settings.commentId } })
      })
      .then(response => response.json())
      .then(data => {
          if(data.errors){
            pos.modules.debug(module.settings.debug, module.settings.id, 'Error while deleting comment', { data: data, commentId: module.settings.commentId });
            new pos.modules.toast('error', `Could not delete comment ${module.settings.commentId}. Please reload the page and try again.`);
          } else {
            delete pos.modules.active[module.settings.id];
            delete pos.modules.active[`${module.settings.id}-menu`];
            delete pos.modules.active[`${module.settings.id}-editor`];

            module.settings.container.remove();

            pos.modules.debug(module.settings.debug, module.settings.id, 'Deleted comment and removed comment node', module.settings.commentId);
          }
      })
      .catch(error => {
        pos.modules.debug(module.settings.debug, module.settings.id, 'Error while deleting comment', { data: error, commentId: module.settings.commentId });
        new pos.modules.toast('error', `Could not delete comment ${module.settings.commentId}. Please reload the page and try again.`);
      });

    };
  }


  module.init();

};