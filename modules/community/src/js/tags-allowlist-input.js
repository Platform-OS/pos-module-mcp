import '@yaireo/tagify/dist/tagify.css';
import Tagify from '@yaireo/tagify';
// import apiFetch from './apiFetch';

const tagsInput = document.querySelector('[data-tags-allowlist-input]');

new Tagify(tagsInput,{
  whitelist: tagsInput.dataset.tagsWhitelist.split(','),
  enforceWhitelist: true,
  dropdown: {
    maxItems: 20,           // <- mixumum allowed rendered suggestions
    classname: "tags-allowlist", // <- custom classname for this dropdown, so it could be targeted
    enabled: 0,             // <- show suggestions on focus
    closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
  },
  originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(',')
});

// const loadSuggestions = (e) => {
//   let value = e.detail.value;
//   tagify.settings.whitelist.length = 0; // reset the whitelist

//   // show loading animation and hide the suggestions dropdown
//   tagify.loading(true).dropdown.hide.call(tagify)

//   apiFetch('/api/posts/tags?query=' + value, {
//     method: 'GET'
//   })
//     .then(function(whitelist){
//       // update inwhitelist Array in-place
//       tagify.settings.whitelist.splice(0, whitelist.length, ...whitelist)
//       tagify.loading(false).dropdown.show.call(tagify, value); // render the suggestions dropdown
//     });
// };

// tagify.on('input', debounce(loadSuggestions, 400));
