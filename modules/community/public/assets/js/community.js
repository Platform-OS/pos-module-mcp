/*
  starting point for loading community modules

  remember to update the import map in the layout when adding new modules
*/



(async() => {
  // an endpoint that stores a lof of user stats, relationship statuses etc.
  // this should be splitted and changed to a more RESTful API but for now it is used as a single point of truth
  if(pos.user){
    window.userInformation = await fetch('/api/users/stats.json')
      .then(res => {
        const userInformation = res.json();

        pos.modules.debug(pos.debug, 'userInformation', 'User stats endpoint loaded', userInformation);
        document.dispatchEvent(new CustomEvent('pos-community-userInformation-loaded', { bubbles: true, detail: userInformation }));
        pos.modules.debug(pos.debug, 'event', 'pos-community-userInformation-loaded', userInformation);
        return userInformation;
      })
      .catch(err => {
        console.error('Error fetching user information:', err);
        return;
      });
  }

  // showing notifications indicators in the header
  if(document.querySelector('#pos-community-header-notifications')){
    const { notifications } = await import('notifications.js');
    pos.modules.notifications = notifications;
    pos.modules.active.notifications = new pos.modules.notifications();
  }

  // feed posting (both posts and comments)
  if(document.querySelector('.pos-community-feed-create')){
    if(!pos.modules.feed){
      pos.modules.feed = {};
    }
    await import('feed/create.js');

    document.querySelectorAll('.pos-community-feed-create').forEach((container, i) => {
      pos.modules.active[container.id || `pos-community-feed-create-${i}`] = new pos.modules.feed.create({
        container: container,
        id: container.id || `pos-community-feed-create-${i}`,
        responseTarget: document.querySelector(container.dataset.responseTarget),
        responseTargetPlace: container.dataset.responseTargetPlace,
        postId: container.dataset.postId
      });
    });
  }

  // feed comments
  if(document.querySelector('.pos-community-post-comment') || document.querySelector('.pos-community-feed-create')){
    if(!pos.modules.feed){
      pos.modules.feed = {};
    }
    await import('feed/comment.js');

    document.querySelectorAll('.pos-community-post-comment').forEach((container, i) => {
      const postId = container.dataset.postId;
      const commentId = container.dataset.commentId;

      pos.modules.active[`pos-community-post-${postId}-comment-${commentId}`] = new pos.modules.feed.comment(({
        container: container,
        id: `pos-community-post-${postId}-comment-${commentId}`,
        postId: postId,
        commentId: commentId
      }));
    });
  }

  // feed posts
  if(document.querySelector('.pos-community-post') || document.querySelector('.pos-community-feed-create')){
    if(!pos.modules.feed){
      pos.modules.feed = {};
    }
    await import('feed/post.js');

    document.querySelectorAll('.pos-community-post').forEach((container, i) => {
      const postId = container.dataset.postId;

      pos.modules.active[`pos-community-post-${postId}`] = new pos.modules.feed.post(({
        container: container,
        id: `pos-community-post-${postId}`,
        postId: postId
      }));
    });
  }

  // feed 'load more' button
  if(document.querySelector('#pos-community-load-feed-more')){
    if(!pos.modules.feed){
      pos.modules.feed = {};
    }
    await import('feed/feed.js');

    pos.modules.active['pos-community-load-feed-more'] = new pos.modules.feed.pagination();
  }

  document.addEventListener('pos-community-feed-create-posted', async event => {
    if(event.detail.type === 'comment'){
      pos.modules.active[`pos-community-post-${event.detail.postId}-comment-${event.detail.commentId}`] = new pos.modules.feed.comment({
        container: event.detail.container,
        id: `pos-community-post-${event.detail.postId}-comment-${event.detail.commentId}`,
        postId: event.detail.postId,
        commentId: event.detail.commentId
      });
    }
    else if(event.detail.type === 'post' && event.detail.container.isConnected){
      pos.modules.active[`pos-community-post-${event.detail.postId}`] = new pos.modules.feed.post({
        container: event.detail.container,
        id: `pos-community-post-${event.detail.postId}`,
        postId: event.detail.postId
      });

      if(!pos.modules.feed.create){
        pos.modules.feed = {};
      }
      await import('feed/create.js');

      const commentCreateContainer = document.querySelector(`#pos-community-post-${event.detail.postId}-comment-create`)
      pos.modules.active[`pos-community-post-${event.detail.postId}-comment-create`] = new pos.modules.feed.create({
        container: commentCreateContainer,
        id: `pos-community-post-${event.detail.postId}-comment-create`,
        responseTarget: document.querySelector(commentCreateContainer.dataset.responseTarget),
        responseTargetPlace: commentCreateContainer.dataset.responseTargetPlace,
        postId: event.detail.postId
      });
    }
  });

  // embeding videos and social media content on feed
  if(document.querySelector('input[name="post[embeded_media]')){
      await import('feed/embed.js');
  }

  // closes the search form after clicking reset button
  document.querySelector('.pos-community-header-search-form [type="reset"]')?.addEventListener('click', e => {
    document.activeElement.blur();
  });

  // handles following and unfollowing users
  if(!pos.modules.user){
    pos.modules.user = {};
  }

  if(pos.user){
    await import ('user/relationship.js');
  }

  // temporary solution for loading more profile cards with Apline
  document.addEventListener('pos-user-card-loaded', event => {
    const form = document.querySelector(`#pos-community-user${event.detail.id}-relationship`);
    const data = Object.fromEntries(new FormData(form));

    pos.modules.active[(form.id || `user-relationship-toggle-${form.id || i}`)] = new pos.modules.user.relationship({
      id: form.id || `user-relationship-toggle-${i}`,
      relationshipType: data.name,
      currentUserId: pos.user.id,
      targetUserId: data.r_id,
      container: form,
      toggleButton: form.querySelectorAll('button[type="submit"]')
    });
  });

  // load server-side rendered user relationship buttons
  if(pos.user){
    document.querySelectorAll('.pos-community-user-relationship').forEach((form, i) => {
      const data = Object.fromEntries(new FormData(form));

      pos.modules.active[(form.id || `user-relationship-toggle-${form.id || i}`)] = new pos.modules.user.relationship({
        id: form.id || `user-relationship-toggle-${i}`,
        relationshipType: data.name,
        currentUserId: pos.user.id,
        targetUserId: data.r_id,
        container: form,
        toggleButton: form.querySelectorAll('button[type="submit"]')
      });
    });
  }



  // handles following and unfollowing tags
  if(document.querySelector('.pos-community-tag-relationship')){
    if(!pos.modules.tag){
      pos.modules.tag = {};
    }

    const { tagRelationship } = await import('tag/relationship.js');
    pos.modules.tag.relationship = new tagRelationship({
      id: 'tag-relationship',
      relationshipType: 'followship:profile',
      currentUserId: pos.user.id
    });

    // load server-side rendered tag relationship buttons
    document.querySelectorAll('.pos-community-tag-relationship').forEach((form, i) => {

      // since there can be more than one tag relationship button on the page, let's group them by id and push the objects to array
      pos.modules.active[form.id] = pos.modules.active[form.id] || [];

      const data = Object.fromEntries(new FormData(form));

      pos.modules.active[form.id].push(new tagRelationship({
        id: form.id,
        relationshipType: data.name,
        currentUserId: pos.user.id,
        targetTagId: data.r_id,
        container: form,
        toggleButton: form.querySelectorAll('button[type="submit"]')
      }));

    });
  }

  // api for storing photo data in the database after upload
  const { photo } = await import('photo/photo.js');
  pos.modules.photo = photo;


  // asynchronously save changes for cover photo on user profile edit form
  const userProfileCoverPhotoUploader = document.querySelector('.pos-community-profile-edit-form-cover-photo');
  if(userProfileCoverPhotoUploader){
    document.addEventListener('pos-community-photo-created', event => {
      if(event.detail.type === 'profile_cover'){
        new pos.modules.toast('success', `Your profile cover photo has been updated`);
      }
    });

    userProfileCoverPhotoUploader.addEventListener('pos-upload-complete', event => {
      if(event.detail.result.successful.length){
        pos.modules.photo.create({
          url: event.detail.result.successful[0].uploadURL,
          type: 'profile_cover',
          width: event.detail.result.successful[0].meta.width,
          height: event.detail.result.successful[0].meta.height,
          objectUuid: pos.user.uuid
        });
      }
    });

    userProfileCoverPhotoUploader.addEventListener('pos-upload-file-removed', event => {
      if(event.detail.file.meta.databaseId){
        pos.modules.photo.remove({
          id: event.detail.file.meta.databaseId
        });
      }
    });
  }

  // asynchronously save changes for avatar on user profile edit form
  const userAvatarPhotoUploader = document.querySelector('.pos-community-profile-edit-form-avatar');
  if(userAvatarPhotoUploader){
    document.addEventListener('pos-community-photo-created', event => {
      if(event.detail.type === 'avatar'){
        new pos.modules.toast('success', `Your user photo has been updated`);
      }
    });

    userAvatarPhotoUploader.addEventListener('pos-upload-complete', event => {
      if(event.detail.result.successful.length){
        pos.modules.photo.create({
          url: event.detail.result.successful[0].uploadURL,
          type: 'avatar',
          width: event.detail.result.successful[0].meta.width,
          height: event.detail.result.successful[0].meta.height,
          objectUuid: pos.user.uuid
        });

        // update all the avatars on page to reflect the change
        document.querySelectorAll('.pos-community-profile-edit-form-avatar .pos-avatar, .pos-community-header-profile-button .pos-avatar').forEach(avatar => {
          if(avatar.querySelector('img')){
            avatar.querySelector('img').src = event.detail.result.successful[0].uploadURL;
          } else {
            const img = document.createElement('img');
            img.src = event.detail.result.successful[0].uploadURL;
            avatar.innerHTML = '';
            avatar.appendChild(img);
          }
        })
      }
    });

    userAvatarPhotoUploader.addEventListener('pos-upload-file-removed', event => {
      if(event.detail.file.meta.databaseId){
        pos.modules.photo.remove({
          id: event.detail.file.meta.databaseId
        });
      }
    });
  }

  // preload selected links on hover
  const linksToPreload = document.querySelectorAll('a[data-pos-preload="hover"]');
  if(linksToPreload.length){
    linksToPreload.forEach(link => {
      link.addEventListener('mouseover', event => {
        if(event.currentTarget !== event.target){ return; }
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = event.target.href;

        document.querySelector('head').appendChild(link);
      }, { once: true });
    });
  }

})();