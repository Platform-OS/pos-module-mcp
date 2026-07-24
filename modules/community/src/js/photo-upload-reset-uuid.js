import { v4 as uuidv4 } from 'uuid';

api.photoUploadReset = function(input, uppyForm){
  const newUUID = uuidv4();
  input.value = newUUID;
  uppyForm.dataset.s3UppyObjectUuid = newUUID;
  document.dispatchEvent(new CustomEvent('photo-upload-reset'));
};
