import apiFetch from '../apiFetch';

window.commentEdit = () => {
  return {
    showEdit: false,
    spinner: false,

    submit(event) {
      event.preventDefault();

      const form = event.target;

      const formData = new FormData(form);
      const body = JSON.stringify(Object.fromEntries(formData));

      apiFetch('/api/comments', {
        method: 'PUT',
        body: body
      }).then((result) => {
        if (result.errors) {
          this.showEdit = false;
          return console.error(result.errors);
        }

        this.$refs.comment.innerHTML = result.comment_body;
        this.showEdit = false;
        this.spinner = false;
      });
    },
  };
};

window.postEdit = () => {
  return {
    showEdit: false,
    spinner: false,

    submit(event) {
      event.preventDefault();

      const form = event.target;

      const formData = new FormData(form);
      const body = JSON.stringify(Object.fromEntries(formData));

      apiFetch('/api/posts', {
        method: 'PUT',
        body: body
      }).then((result) => {
        if (result.errors) {
          this.showEdit = false;
          return console.error(result.errors);
        }

        this.$refs.post.innerHTML = result.post_body_markdown_parsed;
        this.showEdit = false;
      });
    },

    remove(event, postId) {
      apiFetch('/api/posts', {
        method: 'DELETE',
        body: JSON.stringify({ post: { id: postId } })
      }).then((result) => {
        if (result.errors) {
          this.showEdit = false;
          return console.error(result.errors);
        } else {
          this.$refs.cardContent.parentElement.remove();
          const counterField = document.querySelector("#post_count");

          if (counterField) {
            let count = parseInt(counterField.getAttribute('data-post-count'), 10);
            if (!isNaN(count)) {
              count--;
              counterField.setAttribute('data-post-count', count)
              if (count !== 1) {
                counterField.textContent = count + " Results";
              } else {
                counterField.textContent = count + " Result";
              }
            }
          }
        }
      });
    }
  };
};
