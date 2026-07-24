import apiFetch from '../apiFetch';

window.relationship = function (type, header = null) {
  const toggleHeader = () => {
    if (header) {
      if (window.followed_tags.size === window.total_tags.size) {
        document.querySelector(header)?.classList.add('hidden');
      }
      else {
        document.querySelector(header)?.classList.remove('hidden');
      }
    }
  }

  return {
    type,
    exists: undefined,
    initialized: '',
    followers: '',
    showMore: false,
    
    initManual() {
      this.id = this.$refs.form.dataset.id;
      window.tag_followers = window.tag_followers || {};
      window.total_tags = window.total_tags || new Set();
      window.followed_tags = window.followed_tags || new Set();

      if (window.tag_followers[this.id] === undefined) {
        window.tag_followers[this.id] = this.$refs.form.dataset.count || 0;
      }
      const followers = Number(window.tag_followers[this.id]);
      this.followers = `${followers} Follower${followers !== 1 ? 's' : ''}`;
      this.exists = window[this.type]?.includes(this.id);
      this.initialized = true;

      window.total_tags.add(this.id);
      if (this.exists) {
        window.followed_tags.add(this.id);
      }

      toggleHeader();
    },
    toggle() {
      this.id = this.$refs.form.dataset.id;
      const createPath = '/api/relationships/create.json';
      const deletePath = '/api/relationships/delete.json';

      const url = this.exists ? deletePath : createPath;
      const method = this.exists ? 'delete' : 'post';

      const fd = new FormData(this.$refs.form);
      const body = JSON.stringify(Object.fromEntries(fd));

      apiFetch(url, {body, method,})
      .then(() => {
          if (this.exists) {
            delete window[this.type][window[this.type].indexOf(this.id)];
            window.tag_followers[this.id] = Math.max(0, Number(window.tag_followers[this.id]) - 1);
            window.followed_tags.delete(this.id);
          } else {
            window[this.type].push(this.id);
            window.tag_followers[this.id] = Number(window.tag_followers[this.id]) + 1;
            window.followed_tags.add(this.id);
          }
          toggleHeader();
          this.$dispatch('data-ready');
        })
        .finally(() => {
          this.initialized = true;
        });
    },
  };
};
