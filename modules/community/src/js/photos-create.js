import apiFetch from './apiFetch';

// returns width and height of locally read file
const getFileDimensions = (file) => {
  return new Promise((resolve) => {
    let fr = new FileReader;
    let dimensions = {
      width: false,
      height: false
    };

    fr.onload = function() {
      var img = new Image;
      img.onload = function() {
        dimensions.width = img.width;
        dimensions.height = img.height;
        resolve(dimensions);
      };
      img.src = fr.result;
    };

    fr.readAsDataURL(file);
  });
};

const createPhoto = (form, imageUrl, file) => {
  const objectUuid = form.dataset.s3UppyObjectUuid;
  const photoType = form.dataset.s3UppyPhotoType;

  return getFileDimensions(file.data).then((dimensions) => {
    // Create model for this user with s3 image url
    return apiFetch('/api/photos', {
      body: JSON.stringify({ photo: {
        direct_url: imageUrl,
        photo_type: photoType,
        object_uuid: objectUuid,
        photo_height: dimensions.height,
        photo_width: dimensions.width
      }})
    });
  });
};

const photosCreate = (uppy, form, files) => {
  return Promise.all(
    files.map((file) => {
      return createPhoto(form, file.response.body.location, file)
        .then((photo) => {
          uppy.setFileMeta(file.id, { photoId: photo.id });
          return photo;
        });
    })
  );
};

export default photosCreate;
