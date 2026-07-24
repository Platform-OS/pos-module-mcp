import 'easymde/dist/easymde.min.css';
import EasyMDE from 'easymde';
import apiFetch from './apiFetch';

const _form = document.querySelector('[data-s3-photo="form"]');

const createPhoto = (imageUrl) => {
  const objectUuid = _form.dataset.s3UppyObjectUuid;
  const photoType = _form.dataset.s3UppyPhotoType;
  // Create model for this user with s3 image url
  return apiFetch('/api/photos', {
    body: JSON.stringify({ photo: { direct_url: imageUrl, photo_type: photoType, object_uuid: objectUuid } })
  });
};

const getXmlValue = (source, tagName) => {
  const start = source.indexOf(`<${tagName}>`);
  const end = source.indexOf(`</${tagName}>`, start);
  return start !== -1 && end !== -1
    ? source.slice(start + tagName.length + 2, end)
    : '';
};

const markdownEditors = Array.from(document.querySelectorAll('[data-markdown-editor]'));
markdownEditors.forEach((markdownEditor) => {
  const defaults = {
    element: markdownEditor,
    // TODO: fix preview, and uncomment preview icon
    // previewClass: 'markdown',
    showIcons: ['code'],
    hideIcons: ['image', 'upload-image', 'side-by-side', 'fullscreen', 'preview'],
    autoRefresh: 800,
    uploadImage: true,
    status: false,
    minHeight: markdownEditor.rows * 1.8 + 'rem',
    imageUploadFunction: async function(file, success, error) {
      const data = new FormData(_form);
      data.set('file', file, file.name);
      const response = await fetch(_form.action, {method: _form.method, body: data});
      if (response.ok){
        const xmlResponse = await response.text();
        const url = getXmlValue(xmlResponse, 'Location');
        const photo = await createPhoto(url);
        const photoUrl = photo.photo.versions.uncropped.replace(/\s/g, '%20');
        success(photoUrl);
      } else {
        error("Can't upload an image");
      }
    }
  };
  let customOptions = {};
  try {
    customOptions = JSON.parse(markdownEditor.dataset.markdownEditor || '{}');
  } catch (e) {
    console.error(e);
  }
  const options = {
    ...defaults,
    ...customOptions
  };

  const easyMDE = new EasyMDE(options);

  const elementId = markdownEditor.attributes.id.value;
  const label = document.querySelector(`label[for="${elementId}"]`);

  if(label){
    label.onclick = function () { easyMDE.codemirror.focus(); };
  }
});
