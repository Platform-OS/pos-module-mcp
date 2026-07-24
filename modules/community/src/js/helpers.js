/*
  collection of shared helper functions
*/



// create the object that will store the helpers
// ------------------------------------------------------------------------
api.helper = {};


// purpose:		gets a FormData object and parses it into a object or JSON
// arguments: FormData that you want to parse (FormData object)
//            if the output needs to be a stringified JSON (bool)
// returns:   an JS object or stringified JSON
// ************************************************************************
api.helper.formDataToObject = function(formData, toJSON){

  let method = function(object, pair){

    let keys = pair[0].replace(/\]/g,'').split('[');
    let key = keys[0];
    let value = pair[1];

    if(keys.length > 1){

      let i, x, segment;
      let last = value;
      let type = isNaN(keys[1]) ? {} : [];

      value = segment = object[key] || type;

      for (i = 1; i < keys.length; i++) {

        x = keys[i];

        if(i == keys.length-1){
          if(Array.isArray(segment)){
            segment.push(last);
          } else {
            segment[x] = last;
          }
        } else if(segment[x] == undefined){
          segment[x] = isNaN(keys[i+1]) ? {} : [];
        }
        segment = segment[x];
      }

    }

    object[key] = value;

    return object;

  };

  let object = Array.from(formData).reduce(method, {});

  if(toJSON){
    return JSON.stringify(object);
  } else {
    return object;
  }

};
