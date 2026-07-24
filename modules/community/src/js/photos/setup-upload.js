import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import AWSS3 from '@uppy/aws-s3';
import Webcam from '@uppy/webcam';
import ImageEditor from '@uppy/image-editor';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import '@uppy/webcam/dist/style.min.css';
import '@uppy/image-editor/dist/style.min.css';
import { imgToBase64 } from './helpers';

const thumbnailsBase64 = {
  // [fileId]: base64
};


const photosLoad = async (uppy, photos) => {
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const response = await fetch(photo.photo.url);
    const blob = await response.blob();
    uppy.addFile({
      name: photo.photo.file_name,
      type: blob.type,
      data: blob,
      meta: { photoId: photo.id },
      remote: true
    });
  }
  uppy.getFiles().forEach(file => {
    uppy.setFileState(file.id, {
      progress: { uploadComplete: true, percentage: 100, uploadStarted: Date.now() }
    });
  });
};

const handleThumbnail = async (file, preview) => {
  const blob = await fetch(preview).then(r => r.blob());
  const base64 = await imgToBase64(blob);
  thumbnailsBase64[file.id] = base64;
  appendImages();
};

const appendImages = () => {
  const form = document.querySelector('form[data-tc="postForm"]');
  if(form){
    cleanupOldFields(form);

    const inputNodes = Object.values(thumbnailsBase64).slice(0,2).map(base64 => {
      const node = document.createElement('input');
      node.setAttribute('data-form-image', true);
      node.setAttribute('value', base64);
      node.setAttribute('type', 'hidden');
      node.setAttribute('name', 'post[photos][]');
      return node;
    });

    inputNodes.forEach(node => form.appendChild(node));
  }
};

const cleanupOldFields = (form) => {
  const oldInputNodes = form.querySelectorAll('input[data-form-image]');
  oldInputNodes.forEach(node => node.remove());
};

const setupPhotoUpload = async (form, targetSelector, photos) => {
  let uppyLocalesStrings = {
    "myDevice": "My Device",
    "pluginNameCamera": "Camera"
  }
  const maxNumberOfFiles = form.dataset.s3UppyMaxNumberOfFiles;
  const disabled = form.dataset.s3UppyDisabled;
  const note = form.dataset.s3UppyNote;
  const cropRatio = parseFloat(form.dataset.s3UppyCropRatio || NaN);
  photos = photos || JSON.parse(form.dataset.s3UppyPhotos || '[]') || [];
  const target = targetSelector || form.dataset.s3UppyTarget;
  const editorEnabled = !!form.dataset.s3UppyEditorEnabled;
  let localesOverrides = form.dataset.s3UppyLocales;
  if(localesOverrides) {
    localesOverrides = JSON.parse(localesOverrides);
  } else {
    localesOverrides = {};
  }
  Object.assign(uppyLocalesStrings, localesOverrides);

  const uppy = new Uppy({
    autoProceed: (photos.length == 0 && !editorEnabled),
    restrictions: {
      maxFileSize: 10485760, // Limit size to 10 MB on the javascript side
      maxNumberOfFiles: maxNumberOfFiles,
      allowedFileTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    },
  });

  uppy.use(Dashboard,
    {
      inline: true,
      autoOpenFileEditor: editorEnabled,
      replaceTargetContent: true,
      showProgressDetails: true,
      target: target,
      note: note,
      width: '100%',
      proudlyDisplayPoweredByUppy: false,
      showRemoveButtonAfterComplete: !disabled,
      hideCancelButton: disabled,
      hideUploadButton: disabled,
      doneButtonHandler: null,
      locale: {
        strings: {
          dropPasteImport: 'Drag & drop, paste, or %{browse} to upload file',
          browse: 'browse your computer',
        },
      },
      locale: {
        strings: {
          myDevice: uppyLocalesStrings['myDevice']
        }
      }
    })
    .use(Webcam, {
      target: Dashboard,
      modes: ['picture'],
      locale: {
        strings: {
          pluginNameCamera: uppyLocalesStrings['pluginNameCamera'],
        }
      }
    })
    .use(AWSS3, {
      getUploadParameters() {
        const _url = form.getAttribute('action');
        const _formDataArray = Array.from(new FormData(form));
        const _fields = _formDataArray.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});

        // 4. Return resolved promise with Uppy. Uppy it will add file in file param as the last param
        return Promise.resolve({
          method: 'POST',
          url: _url,
          fields: _fields,
        });
      },
    });

    if (editorEnabled) {
      uppy.use(ImageEditor, {
        target: Dashboard,
        actions: {
          revert: true,
          rotate: false,
          granularRotate: false,
          flip: true,
          zoomIn: true,
          zoomOut: true,
          cropSquare: cropRatio === 1, // For avatar
          cropWidescreen: cropRatio !== 1 && !isNaN(cropRatio), // For other images
          cropWidescreenVertical: false,
        },
        cropperOptions: {
          viewMode: 1,
          aspectRatio: cropRatio
        },
      });
    }

  document.addEventListener('photo-upload-reset', () => {
    uppy.reset();
  });

  /**
   * Those events are needed only when we are using AI generated tags. Thumbnails are used to generate additional form fields that contains images thumbnails in base64.
   */
  uppy.on('thumbnail:generated', (file, preview) => handleThumbnail(file, preview));
  uppy.on('file-removed', (file) => {
    delete thumbnailsBase64[file.id];
    appendImages();
  });

  await photosLoad(uppy, photos);
  return uppy;
};

export default setupPhotoUpload;
