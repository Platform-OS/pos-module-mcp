const moveForward = (e, onReorder) => {
  const item = e.target.parentNode;
  if (item.nextElementSibling){
    item.nextElementSibling.insertAdjacentElement('afterend', item);
    onReorder(item);
  }
};

const moveBack = (e, onReorder) => {
  const item = e.target.parentNode;
  if (item.previousElementSibling){
    item.previousElementSibling.insertAdjacentElement('beforebegin', item);
    onReorder(item);
  }
};

const photosSorting = (target, onReorder) => {
  const items = target.querySelectorAll('[role="presentation"] > .uppy-Dashboard-Item');
  for (let i of items) {
    const leftArrow = document.createElement('div');
    leftArrow.appendChild(document.createTextNode('<<'));
    leftArrow.className = 'absolute top-1/2 left-0 bg-frame bg-opacity-50 p-2 cursor-pointer';
    leftArrow.addEventListener("click", (e) => moveBack(e, onReorder));
    i.appendChild(leftArrow);

    const rightArrow = document.createElement('div');
    rightArrow.appendChild(document.createTextNode('>>'));
    rightArrow.className = 'absolute top-1/2 right-0 bg-frame bg-opacity-50 p-2 cursor-pointer';
    rightArrow.addEventListener("click", (e) => moveForward(e, onReorder));
    i.appendChild(rightArrow);
  }
};

export default photosSorting;
