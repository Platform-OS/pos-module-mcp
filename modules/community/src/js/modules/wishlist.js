import apiFetch from '../apiFetch';

function getJSONFromForm(el) {
  const fd = new FormData(el);
  return JSON.stringify(Object.fromEntries(fd));
}

window.wishItem = function () {
  return {
    exists: false,
    headerIcon: document.querySelector('[data-header-wishlist] [data-icon="heartFull"]'),
    initManual() {
      this.exists = window.wishlistIds.includes(this.$refs.form.dataset.id);

      if (this.headerIcon) {
        this.headerIcon.addEventListener('animationend', () => {
            this.headerIcon.classList.remove('wishlist-added');
        });
      }
    },
    toggle() {
      this.$refs.form.classList.add('wishlist-loading');

      const createPath = '/api/relationships/create.json';
      const deletePath = '/api/relationships/delete.json';

      const url = this.exists ? deletePath : createPath;
      const method = this.exists ? 'delete' : 'post';

      const body = getJSONFromForm(this.$refs.form);

      apiFetch(url, {
        body,
        method,
      }).then(() => {
        this.$refs.form.classList.remove('wishlist-loading');
        if(!this.exists){
          this.headerIcon.classList.add('wishlist-added');
        }
        this.exists = !this.exists;
      });
    },
  };
};

window.wishItemRemove = function () {
  return {
    toggle() {
      const body = getJSONFromForm(this.$refs.form);

      this.$refs.form.closest('ul').classList.add('opacity-30');

      apiFetch('/api/relationships/delete.json', {
        body,
        method: 'delete',
      }).then(() => {
        let card = this.$refs.form.closest('.card');
        let hasItems = card.querySelector('ul:not([hidden]');

        if (hasItems) {
          this.$refs.form.closest('ul').hidden = true;
        } else {
          window.location.reload();
        }
      });
    },
  };
};

window.wishlistContent = {

  // if the wishlist is empty (bool)
  blank: false,

  // purpose:		removes an item from the wishlist
  // arguments: the id of the item to remove (int)
  // ------------------------------------------------------------------------
  remove(itemId){
    let item = document.querySelector(`[data-wishlist-item${itemId}]`);
    let counter = document.querySelector('[data-wishlist-counter]');

    let data = {
      name: 'wishlist',
      l_id: api.profile.id,
      r_id: itemId
    };

    item.addEventListener('animationend', () => {
      item.classList.remove('wishlist-removing');
      item.classList.add('!hidden');
    });

    item.classList.add('wishlist-removing');
    counter.textContent = parseInt(counter.textContent) - 1;

    if(!parseInt(counter.textContent)){
      this.blank = true;
    }

    apiFetch('/api/relationships/delete.json', {body: JSON.stringify(data), method: 'delete'}).then((data) => {
      if(!data.valid){
        reject();
      }
    }).catch(() => {
      new posComponents.flash('error', api.strings.cantRemoveFromWishlist);
      item.classList.remove('!hidden');
      counter.textContent = parseInt(counter.textContent) + 1;
    });
  }

};
