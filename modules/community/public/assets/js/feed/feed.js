/*
  handles pagination on feed
*/


window.pos.modules.feed.pagination = function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // class name for the comment container (string)
  module.settings.commentClassName = 'pos-community-post';
  // selector for the comment container (string)
  module.settings.commentSelector = `.pos-community-post-comment`;
  // selector for the comment creation container (string)
  module.settings.commentCreationSelector = `.pos-community-feed-create`;
  // selector for the 'load more' button on feed (string)
  module.settings.loadMoreSelector = `#pos-community-load-feed-more`;


  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    document.addEventListener('pos-frame-loaded', event => {
      if(event.target.matches(module.settings.loadMoreSelector)){
        // remove the old load more button
        event.detail.trigger.remove();
        // run JS for the new posts that have been loaded into the feed
        module.activateNewPosts(event.detail.nodes);
        // activate new load more button
        module.activateLoadMoreButton();
      }
    });

    const loadMoreButton = document.querySelector(module.settings.loadMoreSelector);
    // enable the button
    if(loadMoreButton){
      loadMoreButton.disabled = false;
      // disable the button after clicking it to prevent multiple clicks
      loadMoreButton.addEventListener('click', event => {
        event.target.disabled = true;
      }, { once: true });
    }
  };


  // purpose:		runs JS for new posts that have been loaded into the feed
  // arguments: posts (array of dom nodes) - the posts that have been loaded into the feed
  // ------------------------------------------------------------------------
  module.activateNewPosts = (posts) => {
    posts.filter(node => node.classList?.contains(module.settings.commentClassName)).forEach(container => {
      const postId = container.dataset.postId;

      // activate post editing and deleting
      pos.modules.active[`pos-community-post-${postId}`] = new pos.modules.feed.post(({
        container: container,
        id: `pos-community-post-${postId}`,
        postId: postId
      }));

      // activate comment editing and deleting
      container.querySelectorAll(module.settings.commentSelector).forEach(container => {
        const postId = container.dataset.postId;
        const commentId = container.dataset.commentId;

        pos.modules.active[`pos-community-post-${postId}-comment-${commentId}`] = new pos.modules.feed.comment(({
          container: container,
          id: `pos-community-post-${postId}-comment-${commentId}`,
          postId: postId,
          commentId: commentId
        }));
      });

      // activate comment posting
      container.querySelectorAll(module.settings.commentCreationSelector).forEach(container => {
        pos.modules.active[container.id] = new pos.modules.feed.create({
          container: container,
          id: container.id,
          responseTarget: document.querySelector(container.dataset.responseTarget),
          responseTargetPlace: container.dataset.responseTargetPlace,
          postId: container.dataset.postId
        });
      });
    });
  };


  // purpose:		actiavates the 'load more' button for the new posts that have been loaded into the feed
  // ------------------------------------------------------------------------
  module.activateLoadMoreButton = () => {
    const newLoadButton = document.querySelector(module.settings.loadMoreSelector);
    if(newLoadButton){
      pos.modules.active['pos-community-load-feed-more'] = new pos.modules.load({
        id: 'pos-community-load-feed-more',
        endpoint: newLoadButton.getAttribute('data-load-content'),
        target: newLoadButton.getAttribute('data-load-target'),
        where: newLoadButton.getAttribute('data-load-where'),
        trigger: newLoadButton
      });
    }

    // enable the button
    const loadMoreButton = document.querySelector(module.settings.loadMoreSelector);
    if(loadMoreButton){
      loadMoreButton.disabled = false;
      // disable the button after clicking it to prevent multiple clicks
      loadMoreButton.addEventListener('click', event => {
        event.target.disabled = true;
      }, { once: true });
    }
  };


  module.init();
};