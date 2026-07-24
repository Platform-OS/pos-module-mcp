/*
  handles posts on the feed
*/

window.pos.modules.feed.post = function(settings){

  // cache 'this' value not to be overwritten later
  const module = this;


  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // post container (dom node)
  module.settings.container = settings.container;
  // unique module id (string)
  module.settings.id = settings.id;
  // post id (string)
  module.settings.postId = settings.postId;

  // text content of the post (dom node)
  module.settings.contentNode = settings.contentNode || module.settings.container.querySelector('.pos-community-post-content');
  // title content of the post (dom node)
  module.settings.titleNode = settings.titleNode || module.settings.container.querySelector('.pos-community-post-title a');

  // edit form (dom node)
  module.settings.editForm = module.settings.editForm || module.settings.container.querySelector('.pos-community-post-edit form');

  if(module.settings.editForm){
    // class added to the contaier when in editing mode (string)
    module.settings.editActiveClass = 'pos-community-post-editing';
    // endpoint path for editing a comment (string)
    module.settings.editEdpoint = settings.editEdpoint || '/api/posts';
    // post edit button (dom node)
    module.settings.editButton = settings.editButton || module.settings.container.querySelector('.pos-community-post-menu-edit');
    // markdown editor instance (object)
    module.settings.editor = settings.editor || pos.modules.active[`pos-community-post-${module.settings.postId}-editor`]
    // button that cancels editing (dom node)
    module.settings.editCancel = settings.editCancel || module.settings.container.querySelector('.pos-community-post-edit-close');
    // initial post content (string)
    module.settings.initialContent = module.settings.editForm.querySelector('[name="post[body]"]').value;
  }

  // post delete button (dom node)
  module.settings.deleteButton = settings.deleteButton || module.settings.container.querySelector('.pos-community-post-menu-delete');
  if(module.settings.deleteButton){
    // endpoint path for deleting a comment (string)
    module.settings.deleteEndpoint = settings.deleteEndpoint || '/api/posts';
    // confirmation message when deleting a comment
    module.settings.deleteConfirmationMessage = settings.deleteConfirmationMessage || module.settings.deleteButton.dataset.confirmationMessage;
  }

  // like button (dom node)
  module.settings.likeButton = settings.likeButton || module.settings.container.querySelector('.pos-community-post-like');
  // class added to like button when post is liked (string)
  module.settings.likeActiveClass = 'pos-community-post-like-active';
  // class added to like button when freshly activated (string)
  module.settings.likeFreshClass = 'pos-community-post-like-fresh';
  // node with the likes counter (dom node)
  module.settings.likesCountNode = module.settings.likesCounterNode || module.settings.likeButton?.querySelector('.pos-community-post-like-count');
  // number of likes (int)
  module.settings.likesCount = settings.likesCount || parseInt(module.settings.likesCountNode?.innerText) || 0;
  // if the post was liked by the current user (bool)
  module.settings.liked = module.settings.likeButton?.classList.contains(module.settings.likeActiveClass);
  // class added to container when there are multiple likes to handle pluralization of the like counter label (string)
  module.settings.likeMultipleClass = 'pos-community-post-like-multiple';


  // debug mode enabled (bool)
  module.settings.debug = settings.debug || false;



  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    pos.modules.debug(module.settings.debug, module.settings.id, 'Initializing post module', module.settings);

    // create content editor if none assigned (for newly added comment nodes)
    if(module.settings.editForm && !module.settings.editor){
      const editorId = `pos-community-post-${module.settings.postId}-editor`;
      const markdownContainer = module.settings.container.querySelector(`#pos-community-post-${module.settings.postId}-edit .pos-markdown`);

      // activate the @mention popover if it wasn't picked up on page load (e.g. right after creating a post via AJAX)
      const mentionPopoverContainer = markdownContainer.querySelector('.pos-popover');
      if(mentionPopoverContainer && !pos.modules.active[`${editorId}-mention-popover`]){
        pos.modules.active[`${editorId}-mention-popover`] = new pos.modules.popover(mentionPopoverContainer);
      }

      module.settings.editor = pos.modules.active[editorId] = new pos.modules.markdown({
        container: markdownContainer,
        id: editorId,
        content: module.settings.editForm.querySelector('[name="post[body]"]').value
      });
    }

    // highlight code
    if(module.settings.editForm){
      module.settings.container.addEventListener('pos-community-post-editor-saved', async () => {
        if(!pos.modules.code){
          await import('modules/common-styling/js/pos-code.js');
        }
        module.settings.contentNode.querySelectorAll('pre code').forEach((element, index) => {
          pos.modules.active[`pos-code-post-${module.settings.postId}-${index}`] = new pos.modules.code({
            container: element,
            id: `pos-code-post-${module.settings.postId}-${index}`
          });
        });
      });
    }

    if(module.settings.editForm){
      // edit post
      if(module.settings.postId){
        module.settings.editButton.addEventListener('click', () => {
          module.showEditor();
        });
        module.settings.editCancel.addEventListener('click', () => {
          module.closeEditor();
          // bring back the initial value
          module.settings.editor.value(module.settings.editor.settings.textarea.value);
        });

        module.settings.editForm.addEventListener('submit', event => event.preventDefault());
        module.settings.container.addEventListener('pos-markdown-validation-passed', module.save);
      }
    }

    // delete post
    if(module.settings.deleteButton){
      if(module.settings.postId){
        module.settings.deleteButton.addEventListener('click', () => {
          if(window.confirm(module.settings.deleteConfirmationMessage)){
            module.delete();
          }
        });
      }
    }

    // like post
    if(module.settings.likeButton){
      module.settings.likeButton.addEventListener('click', event => {
        event.preventDefault();

        if(module.settings.liked){
          module.unlike();
        } else {
          module.like();
        }
      });
    }
  };


  // purpose:		shows post editor
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.showEditor = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Showing post editor', { postId: module.settings.postId, editor: module.settings.editor });
      
      module.settings.container.classList.add(module.settings.editActiveClass);

      module.settings.editor.refresh();
      module.settings.editor.focus();

      module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-editor-opened', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-editor-opened', { target: module.settings.container, editor: module.settings.editor });
    };
  }


  // purpose:		hides post editor
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.closeEditor = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Hidding post editor', { postId: module.settings.postId, editor: module.settings.editor });
      
      // remove active class
      module.settings.container.classList.remove(module.settings.editActiveClass);
      // clean up the editor
      module.settings.editor.reset();
      module.settings.editor.value(module.settings.initialContent);

      module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-editor-closed', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor } }));
      pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-editor-closed', { target: module.settings.container, editor: module.settings.editor });
    };
  }
  
  // purpose:		save edited post
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.save = () => {
      pos.modules.debug(module.settings.debug, module.settings.id, 'Saving post edits…', { postId: module.settings.postId, editor: module.settings.editor });
    
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
          pos.modules.debug(module.settings.debug, module.settings.id, 'Error while saving post edits', { data: data, postId: module.settings.postId });
          new pos.modules.toast('error', `Could not save edits for post ${module.settings.postId}. Please reload the page and try again.`);
        } else {
          module.settings.contentNode.innerHTML = data.post_body_markdown_parsed;
          if(module.settings.titleNode){ module.settings.titleNode.textContent = data.title; }
          module.settings.initialContent = module.settings.editor.value();

          module.closeEditor();

          pos.modules.debug(module.settings.debug, module.settings.id, 'Saved post edits and updated the view', { postId: module.settings.postId, content: data.post_body_markdown_parsed });

          module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-editor-saved', { bubbles: true, detail: { target: module.settings.container, editor: module.settings.editor, content: data } }));
          pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-editor-saved', { target: module.settings.container, editor: module.settings.editor, content: data });
        }
      });
    };
  }


  // purpose:		deleting an existing post
  // ------------------------------------------------------------------------
  if(module.settings.editForm){
    module.delete = () => {

      pos.modules.debug(module.settings.debug, module.settings.id, 'Attempting to delete post', module.settings.postId);

      fetch(module.settings.deleteEndpoint, {
          method: 'delete',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-Token': pos.csrfToken
          },
          body: JSON.stringify({ post: { id: module.settings.postId } })
      })
      .then(response => response.json())
      .then(data => {
          if(data.errors){
            pos.modules.debug(module.settings.debug, module.settings.id, 'Error while deleting post', { data: data, postId: module.settings.postId });
            new pos.modules.toast('error', `Could not delete comment ${module.settings.postId}. Please reload the page and try again.`);
          } else {
            delete pos.modules.active[module.settings.id];
            delete pos.modules.active[`${module.settings.id}-menu`];
            delete pos.modules.active[`${module.settings.id}-editor`];

            module.settings.container.remove();

            pos.modules.debug(module.settings.debug, module.settings.id, 'Deleted post and removed post node', module.settings.postId);
          }
      })
      .catch(error => {
        pos.modules.debug(module.settings.debug, module.settings.id, 'Error while deleting post', { data: error, postId: module.settings.postId });
        new pos.modules.toast('error', `Could not delete post ${module.settings.postId}. Please reload the page and try again.`);
      });

    };
  }


  // purpose:		liking a post
  // ------------------------------------------------------------------------
  module.like = () => {

    pos.modules.debug(module.settings.debug, module.settings.id, 'Attempting to like post', module.settings.postId);

    module.settings.likeButton.querySelector('[type="submit"]').disabled = true;

    module.settings.likeButton.classList.add(module.settings.likeActiveClass, module.settings.likeFreshClass);
    module.settings.likesCount++;
    module.settings.likesCountNode.innerText = module.settings.likesCount;
    if(module.settings.likesCount === 0 || module.settings.likesCount > 1){
      module.settings.likeButton.classList.add('pos-community-post-like-multiple');
    } else {
      module.settings.likeButton.classList.remove('pos-community-post-like-multiple');
    }

    fetch(module.settings.likeButton.action, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': pos.csrfToken
        },
        body: JSON.stringify(Object.fromEntries(new FormData(module.settings.container.querySelector('.pos-community-post-like'))))
    })
    .then(response => response.json())
    .then(data => {
      if(data.errors){
        module.settings.likeButton.classList.remove(module.settings.likeActiveClass, module.settings.likeFreshClass);
        module.settings.likesCount--;
        module.settings.likesCountNode.innerText = module.settings.likesCount;

        pos.modules.debug(module.settings.debug, module.settings.id, 'Error while liking the post', { data: data, postId: module.settings.postId });
        new pos.modules.toast('error', `Could not like post ${module.settings.postId}. Please reload the page and try again.`);
      } else {
        module.settings.likeButton.querySelector('[name="type"]').value = 'clear';
        module.settings.liked = true;

        pos.modules.debug(module.settings.debug, module.settings.id, 'Liked post', { postId: module.settings.postId, likesCount: module.settings.likesCount });
        module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-liked', { bubbles: true, detail: { target: module.settings.container, postId: module.settings.postId, likesCount: module.settings.likesCount } }));
        pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-liked', { target: module.settings.container, postId: module.settings.postId, likesCount: module.settings.likesCount });
      }

      module.settings.likeButton.querySelector('[type="submit"]').disabled = false;
    })
    .catch(error => {
      module.settings.likeButton.classList.remove(module.settings.likeActiveClass, module.settings.likeFreshClass);
      module.settings.likesCount--;
      module.settings.likesCountNode.innerText = module.settings.likesCount;
      module.settings.likeButton.querySelector('[type="submit"]').disabled = false;

      pos.modules.debug(module.settings.debug, module.settings.id, 'Error while liking the post', { data: error, postId: module.settings.postId });
      new pos.modules.toast('error', `Could not like post ${module.settings.postId}. Please reload the page and try again.`);
    });

  };


  // purpose:		unliking a post
  // ------------------------------------------------------------------------
  module.unlike = () => {

    pos.modules.debug(module.settings.debug, module.settings.id, 'Attempting to unlike post', module.settings.postId);

    module.settings.likeButton.querySelector('[type="submit"]').disabled = true;

    module.settings.likeButton.classList.remove(module.settings.likeActiveClass, module.settings.likeFreshClass);
    module.settings.likesCount--;
    module.settings.likesCountNode.innerText = module.settings.likesCount;
    if(module.settings.likesCount === 0 || module.settings.likesCount > 1){
      module.settings.likeButton.classList.add('pos-community-post-like-multiple');
    } else {
      module.settings.likeButton.classList.remove('pos-community-post-like-multiple');
    }

    fetch(module.settings.likeButton.action, {
        method: 'put',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': pos.csrfToken
        },
        body: JSON.stringify(Object.fromEntries(new FormData(module.settings.container.querySelector('.pos-community-post-like'))))
    })
    .then(response => response.json())
    .then(data => {
      if(data.errors){
        module.settings.likeButton.classList.add(module.settings.likeActiveClass, module.settings.likeFreshClass);
        module.settings.likesCount++;
        module.settings.likesCountNode.innerText = module.settings.likesCount;

        pos.modules.debug(module.settings.debug, module.settings.id, 'Error while unliking the post', { data: data, postId: module.settings.postId });
        new pos.modules.toast('error', `Could not unlike post ${module.settings.postId}. Please reload the page and try again.`);
      } else {
        module.settings.likeButton.querySelector('[name="type"]').value = 'up';
        module.settings.liked = false;

        pos.modules.debug(module.settings.debug, module.settings.id, 'Unliked post', { postId: module.settings.postId, likesCount: module.settings.likesCount });
        module.settings.container.dispatchEvent(new CustomEvent('pos-community-post-unliked', { bubbles: true, detail: { target: module.settings.container, postId: module.settings.postId, likesCount: module.settings.likesCount } }));
        pos.modules.debug(module.settings.debug, 'event', 'pos-community-post-unliked', { target: module.settings.container, postId: module.settings.postId, likesCount: module.settings.likesCount });
      }

      module.settings.likeButton.querySelector('[type="submit"]').disabled = false;
    })
    .catch(error => {
      module.settings.likeButton.classList.add(module.settings.likeActiveClass, module.settings.likeFreshClass);
      module.settings.likesCount++;
      module.settings.likesCountNode.innerText = module.settings.likesCount;
      module.settings.likeButton.querySelector('[type="submit"]').disabled = false;

      pos.modules.debug(module.settings.debug, module.settings.id, 'Error while unliking the post', { data: error, postId: module.settings.postId });
      new pos.modules.toast('error', `Could not unlike post ${module.settings.postId}. Please reload the page and try again.`);
    });

  };


  module.init();

};