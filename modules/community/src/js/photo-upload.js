import setupPhotoUpload from './photos/setup-upload';
import photosCreate from './photos-create';

const setupPhotoUploadForms = async (forms) => {
  forms.forEach(async (form) => {
    const uppy = await setupPhotoUpload(form);
    const editorEnabled = !!form.dataset.s3UppyEditorEnabled;

    if (editorEnabled) {
      uppy.on('file-editor:complete', () => {
        uppy.upload().then(({ successful }) => {
          photosCreate(uppy, form, successful)
            .then((photos) => {
              document.dispatchEvent(
                new CustomEvent('photos-added', {
                  detail: { photos: photos, preview: successful[0].preview }
                })
              );
            });
        });
      });
    } else {
      uppy.on('complete', ({ successful }) => {
        photosCreate(uppy, form, successful)
          .then((photos) => {
            document.dispatchEvent(
              new CustomEvent('photos-added', {
                detail: { photos: photos, preview: successful[0].preview }
              })
            );
          });
      });
    }

    uppy.on('file-removed', (file, reason) => {
      if (reason == 'removed-by-user') document.dispatchEvent(
        new CustomEvent('photo-removed', { detail: { photoId: file.meta.photoId } })
      );
    });
  });
};

setupPhotoUploadForms(document.querySelectorAll('[data-s3-uppy-photo="form"]'));
