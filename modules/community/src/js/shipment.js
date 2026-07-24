import { reject } from 'lodash';
import apiFetch from './apiFetch';

window.createPackage = function(formData){

  let data = api.helper.formDataToObject(formData);

  return apiFetch('/api/shipments.json', {
    method: data.id ? 'PUT' : 'POST',
    body: JSON.stringify({
      "shipment":
        {
          ...data
        }
      })
  }).then((result) => {
    if (result.valid) {
      return result;
    } else {
      console.error(result);
      reject(result);
    }
  });
};


window.deletePackage = function(shipmentId){
  return apiFetch('/api/shipments.json', {
    method: 'DELETE',
    body: JSON.stringify({ shipment: { id: shipmentId } })
  }).then((result) => {
    if(result.valid){
      return result;
    } else {
      console.error(result);
      reject(result);
    }
  });
};


window.getLabel = function(shipmentId, time = 1000, retries = 1){

  function delay(time){
    return new Promise((resolve) => {
      setTimeout(resolve, time);
    });
  }

  return delay(time).then(() => {
    return apiFetch('/api/shipments/label.json?shipment=' + shipmentId, {
      method: 'GET'
    }).then((result) => {
      if(result.valid){
        if(result.files.length){
          return result.files;
        } else {
          if(retries <= 5){
            return getLabel(shipmentId, time*2, retries+1);
          } else {
            return { errors: { retriesLimit: true } };
          }
        }
      } else {
        console.error(result);
        reject(result);
      }
    });
  });
};
