import setupPhotoUpload from './photos/setup-upload';
import photosSorting from './photos-sorting';
import photosCreate from './photos-create';

const addToAllVariants = (photos) => {
  const variants = Alpine.store('variants').variants;
  variants.forEach(variant => {
    const variantRaw = Alpine.raw(variant);
    variant.photos = variantRaw.photos.concat(photos);
    variant.photo_ids = variant.photos.map((photo) => photo.id);
  });
};

const removeFromAllVariants = (file) => {
  const variants = Alpine.store('variants').variants;
  variants.forEach(variant => {
    const variantRaw = Alpine.raw(variant);
    variant.photos = variantRaw.photos.filter(photo => photo.id != file.meta.photoId);
    variant.photo_ids = variant.photos.map((photo) => photo.id);
  });
};

api.setupPhotoUploadItemVariant = (target, variant, isMainVariant) => {
  const variantRaw = Alpine.raw(variant);
  if (!variantRaw.photos) variantRaw.photos = Alpine.raw(Alpine.store('main_variant').photos) || [];
  if (!variantRaw.photo_ids) variantRaw.photo_ids = Alpine.raw(Alpine.store('main_variant').photo_ids) || [];
  variantRaw.photos.sort((a,b) => variantRaw.photo_ids.indexOf(a.id) - variantRaw.photo_ids.indexOf(b.id));
  const form = document.querySelector('[data-s3-uppy-photo="items"]');

  setupPhotoUpload(form, target, variantRaw.photos)
    .then((uppy) => {
      uppy.on('complete', ({ successful }) => {
        photosCreate(uppy, form, successful)
          .then((photos) => {
            variant.photos = variantRaw.photos.concat(photos);
            variant.photo_ids = variant.photos.map((photo) => photo.id);
            if (isMainVariant) addToAllVariants(photos);
          });
      });
      uppy.on('file-removed', (file, reason) => {
        if (reason == 'removed-by-user') {
          variant.photos = variantRaw.photos.filter(photo => photo.id != file.meta.photoId);
          variant.photo_ids = variant.photos.map((photo) => photo.id);
          if (isMainVariant) removeFromAllVariants(file);
        }
      });
      const onReorder = (item) => {
        const files = uppy.getFiles();
        const fileIds = Array.from(item.parentNode.childNodes).map(e => e.id.replace('uppy_', ''));
        const sortedFiles = files.sort((a, b) => fileIds.indexOf(a.id) - fileIds.indexOf(b.id));
        variant.photo_ids = sortedFiles.map(f => f.meta.photoId);
      };

      photosSorting(document.querySelector(target), onReorder);
    });
};

api.setupPhotoUploadItemVariant("#drag-drop-area", Alpine.store('main_variant'), true);
