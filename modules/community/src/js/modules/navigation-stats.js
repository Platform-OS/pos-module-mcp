import Alpine from 'alpinejs';
Alpine.store('notifications', { results: [] });

window.navigationStats = function () {

  return {
    cartQuantity: false,
    inboxUnread: false,
    unreadCount: false,

    store(key, list){
      window[key] = (list || []).map(e => e.r_id);
    },

    setNotifications(notifications) {
      notifications.unread_count = notifications.unread_count > 9 ? '9+' : notifications.unread_count;

      Alpine.store('notifications', notifications);
    },

    init() {
      fetch('/api/users/stats.json')
        .then((res) => res.json())
        .then((res) => {
          this.cartQuantity = res.cart_quantity;
          this.inboxUnread = res.inbox_unread;

          this.store('wishlistIds', res['relationships']['wishlist']);
          this.store('tagIds', res['relationships']['followship:tag']);
          this.store('postIds', res['relationships']['followship:post']);
          this.store('profileIds', res['relationships']['followship:profile']);
          this.store('groupIds', res['relationships']['membership']);

          this.setNotifications(res.notifications);

          this.$dispatch('data-ready');
        })
        .catch(() => {
          this.cartQuantity = false;
          this.inboxUnread = 0;
          this.unreadCount = false;
        });
    },
  };
};
