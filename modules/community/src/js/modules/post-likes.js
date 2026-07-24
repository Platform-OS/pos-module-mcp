import apiFetch from '../apiFetch';

function getJSONFromForm(el) {
  const fd = new FormData(el);
  return JSON.stringify(Object.fromEntries(fd));
}

window.postLikes = function (opts) {
  return {
    liked: opts.liked,
    count: opts.count,
    toggle() {
      this.$refs.heart.classList.add('wishlist-loading');

      const url = this.$refs.form.action;
      const method = 'put';
      const body = getJSONFromForm(this.$refs.form);

      apiFetch(url, {body, method})
        .then((result) => {
          this.$refs.heart.classList.remove('wishlist-loading');
          if(result.errors) {
            new posComponents.flash('error', result.errors.base[0], { autohide: 5000 });
          } else {
            this.liked = !this.liked;
            this.count = result.upvote_profile_ids.length;
          }
        })
        .catch(() => {
          this.$refs.heart.classList.remove('wishlist-loading');
        });
    },
  };
};
