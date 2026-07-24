import { $q, $qa } from './qs';

export default class Draggable {
  constructor(container) {
    this.container = container;
    this.draggables = $qa('[data-draggable]', container);
    if (this.container.getAttribute('draggable-initialized')) return;
    this.init();
  }

  init() {
    this.container.setAttribute('draggable-initialized', true);
    this.draggables.forEach(draggable => {
      draggable.setAttribute('draggable', 'true');
      draggable.addEventListener('dragstart', () => {
        draggable.classList.add('dragging', 'opacity-50');
      });

      draggable.addEventListener('dragend', () => {
        draggable.classList.remove('dragging', 'opacity-50');
        this.container.dispatchEvent(new CustomEvent('draggable-dragend'));
      });
    });

    this.container.addEventListener('dragover', e => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(e.clientY);
      const draggable = $q('.dragging', this.container);
      if (afterElement == null) {
        this.container.appendChild(draggable);
      } else {
        this.container.insertBefore(draggable, afterElement);
      }
    });
  }

  getDragAfterElement(y) {
    const draggableElements = this.draggables.filter(node => !node.classList.contains('dragging'));

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
}
