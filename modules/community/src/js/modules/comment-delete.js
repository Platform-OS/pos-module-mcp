import apiFetch from '../apiFetch';

window.commentDelete = () => {
  return {
    removeComment(event, commentId) {
      apiFetch('/api/comments', {
        method: 'DELETE',
        body: JSON.stringify({ comment: { id: commentId } })
      }).then((result) => {
        if (result.errors) {
          this.showEdit = false;
          return console.error(result.errors);
        } else {
          this.$refs.comment.parentElement.parentElement.remove();
        }
      });
    }
  };
};
