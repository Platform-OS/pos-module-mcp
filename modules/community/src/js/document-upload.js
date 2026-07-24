import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import AWSS3 from '@uppy/aws-s3';

import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import apiFetch from './apiFetch';

const createDocument = (form, url) => {
  const objectUuid = form.dataset.s3UppyObjectUuid;
  const type = form.dataset.s3UppyType;

  return apiFetch('/api/documents', {
    body: JSON.stringify({ document: { direct_url: url, document_type: type, object_uuid: objectUuid } })
  });
};

const removeDocument = (objectId) => {
  return apiFetch('/api/documents', {
    method: 'DELETE',
    body: JSON.stringify({ document: { id: objectId } })
  });
};

const loadExistingDocuments = async (uppy, documents) => {
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i];
    const blob = new Blob();
    uppy.addFile({
      name: document.file.file_name,
      type: blob.type,
      source: document.file.url,
      data: blob,
      meta: { objectId: document.id },
      remote: true
    });
  }
  uppy.getFiles().forEach(file => {
    uppy.setFileState(file.id, {
      progress: { uploadComplete: true, percentage: 100, uploadStarted: Date.now() }
    });
  });
};


const forms = document.querySelectorAll('[data-s3-uppy="document"]');
forms.forEach((form)=> {
  const maxNumberOfFiles = form.dataset.s3UppyMaxNumberOfFiles;
  const note = form.dataset.s3UppyNote;
  const disabled = form.dataset.s3UppyDisabled;
  const documents = JSON.parse(form.dataset.s3UppyDocuments || '[]') || [];
  const target = form.dataset.s3UppyTarget;

  var mediaTypes = ['application/pdf'];
  if (form.dataset.s3UppyMediaTypes) {
    mediaTypes = form.dataset.s3UppyMediaTypes.split(',');
  }

  const uppy = new Uppy({
    autoProceed: documents.length == 0,
    restrictions: {
      maxFileSize: 2097152, // Limit size to 2 MB on the javascript side
      maxNumberOfFiles: maxNumberOfFiles,
      allowedFileTypes: mediaTypes,
    },
  });

  uppy.use(Dashboard,
    {
      inline: true,
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

  uppy.on('complete', ({ successful }) => {
    Promise.all(
      successful.map((file) => {
        return createDocument(form, file.response.body.location)
          .then((object) => {
            uppy.setFileMeta(file.id, { objectId: object.id });
            return object;
          });
      })
    );

    document.dispatchEvent(new CustomEvent('upload-complete', { detail: successful }));
  });

  uppy.on('file-removed', (file, reason) => {
    if (reason == 'removed-by-user') removeDocument(file.meta.objectId);

    document.dispatchEvent(new CustomEvent('upload-removed'));
  });

  loadExistingDocuments(uppy, documents);
});
