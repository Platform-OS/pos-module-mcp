const photoUploadAvatar = function(){
  const module = this;

  module.init = () => {
    document.addEventListener('photos-added', module.updateAvatar);
  };

  module.updateAvatar = (event) => {
    if(event.detail.photos[0].photo_type === 'avatar'){
      const photoUrl = event.detail.preview;
      document.querySelectorAll('.pos-avatar img').forEach(img => {
        img.src = photoUrl;
      });
    }
  };

  module.init();
};
api.photoUploadAvatar = new photoUploadAvatar();
