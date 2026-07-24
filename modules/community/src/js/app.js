import '../css/app.css';

import { $q, $qa } from './modules/qs';

import './helpers';
import './dropdown';
import './list-filtered';
import Alpine from 'alpinejs';
import mask from '@alpinejs/mask';

import('./time-format');

import './modules/invites';
import './modules/navigation-stats';
import './modules/relationship';
import './modules/wishlist';
import './modules/post-likes';
import './modules/search-component';
import './modules/otp-form';
import './modules/frames';
import './modules/char-counter';
import './modules/select-multiple';
import './modules/item-attributes';
import './modules/comment-edit';
import './modules/comment-delete';

import './shipment';

window.groupBy = require('lodash.groupby');
window.uniqBy = require('lodash.uniqby');
window.isEqual = require('lodash.isequal');

window.Alpine = Alpine;
Alpine.start();

const cart = $q('[data-cart]');
if (cart) {
  import(/* webpackChunkName: "cart" */ './cart');
}

const syntaxHighlighting = $q('pre > code');
if (syntaxHighlighting) {
  import(/* webpackChunkName: "syntax-highlighting" */ './syntax-highlighting');
}

const slider = $q('[data-slider]');
if (slider) {
  import(/* webpackChunkName: "slider" */ './slider');
}

const uppyPhotos = $q('[data-s3-uppy-photo]');
if (uppyPhotos) {
  import(/* webpackChunkName: "photo-upload" */ './photo-upload');
  import(/* webpackChunkName: "photo-upload-reset-uuid" */ './photo-upload-reset-uuid');
}

const photoUploadBase = $q('[data-photo-upload-base]');
if (uppyPhotos && photoUploadBase) {
  import(/* webpackChunkName: "photo-upload-base" */ './photo-upload-base');
}

const photoUploadItems = $q('[data-photo-upload-items]');
if (uppyPhotos && photoUploadItems) {
  import(/* webpackChunkName: "photo-upload-items" */ './photo-upload-items');
}

const photoUploadAvatar = $q('.pos-community-profile-edit-form-avatar');
if (uppyPhotos && photoUploadAvatar) {
  import(/* webpackChunkName: "photo-upload-avatar" */ './photo-upload-avatar');
}

const uppyDocuments = $q('[data-s3-uppy="document"]');
if (uppyDocuments) {
  import(/* webpackChunkName: "document-upload" */ './document-upload');
}

const commentNewPost = $q('[data-comment-show-new-post]');
if (commentNewPost) {
  import(/* webpackChunkName: "comment-new-post" */ './comment-new-post');
}

const markdownEditor = $q('[data-markdown-editor]');
if (markdownEditor) {
  import(/* webpackChunkName: "markdown-editor" */ './markdown-editor');
}

const markdownImages = $q('.markdown img');
if (markdownImages) {
  import(/* webpackChunkName: "markdown-images" */ './markdown-images');
}

const styleGuide = $q('#styleGuide');
if (styleGuide) {
  import(/* webpackChunkName: "style-guide" */ './style-guide');
}

const tagsInput = $q('[data-tags-input]');
if (tagsInput) {
  import(/* webpackChunkName: "tags-input" */ './tags-input');
}

const tagsAllowlistInput = $q('[data-tags-allowlist-input]');
if (tagsAllowlistInput) {
  import(/* webpackChunkName: "tags-allowlist-input" */ './tags-allowlist-input');
}

const groupJoinButtons = $qa('button[data-join-group]');
if (groupJoinButtons.length > 0) {
  import(/* webpackChunkName: "groups-join" */ './groups-join');
}

const tabbedFormElements = $qa('form[data-tabbed-form-validation]');
if (tabbedFormElements.length) {
  (async function () {
    const tabbedFormValidationModule = await import(
      /* webpackChunkName: "tabbed-form-validation" */ './tabbed-form-validation'
    );
    const module = tabbedFormValidationModule.default;
    tabbedFormElements.forEach(element => {
      new module(element);
    });
  })();
}

function initDraggable() {
  const draggableContainers = $qa('[data-draggable-container]');
  if (draggableContainers.length) {
    (async function () {
      const draggableModule = await import(
        /* webpackChunkName: "draggable" */ './modules/draggable'
      );
      const module = draggableModule.default;
      draggableContainers.forEach(element => {
        new module(element);
      });
    })();
  }
}
document.addEventListener('init-draggable', initDraggable);
initDraggable();

document.querySelectorAll('[data-confirm="delete"]').forEach((element) => {
  element.addEventListener('click', (event) => {
    if (!confirm("Are you sure you want to proceed with the deletion?")) {
      event.preventDefault();
    }
  });
});
