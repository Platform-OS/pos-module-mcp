import apiFetch from './apiFetch';

const photoUploadBase = function(){
  const module = this;

  module.init = () => {
    document.addEventListener('photo-removed', module.removePhoto);
  };

  module.removePhoto = (event) => {
    return apiFetch('/api/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photo: { id: event.detail.photoId } })
    });
  };

  module.init();
};
api.photoUploadBase = new photoUploadBase();
