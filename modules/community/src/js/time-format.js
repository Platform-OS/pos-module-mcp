import * as timeago from 'timeago.js';

const renderTimeago = function(event) {
  const elements = document.querySelectorAll(`${event.detail.scope} .timeago`);

  if (elements.length > 0){
    timeago.render(elements, 'en_US', { minInterval: 60 });
  }
};

window.addEventListener('frame-rendered', renderTimeago);
window.dispatchEvent(new CustomEvent("frame-rendered", { detail: { scope: "body" } }));
