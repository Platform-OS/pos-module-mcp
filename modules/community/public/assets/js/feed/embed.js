// place to put the media URL value to save it to DB (dom node)
const mediaUrlInput = document.querySelector('input[name="post[embeded_media]"]');
// where the user puts the text (dom node)
const contentInput = document.querySelector('[data-hashtag-input]');
// main container with the player that will be shown when needed (dom node)
const playerContainer = document.querySelector('#mediaEmbed');
// iframe for embeded content (dom node)
const embedIframe = playerContainer.querySelector('iframe');
// button that clears the media attachment (dom node)
const removeMediaAttachmentButton = playerContainer.querySelector('#removeMediaAttachment');



// purpose:   returns iframe embed url for given website
// arguments: id of the media (string)
// returns:   social media iframe embed url (string)
// ------------------------------------------------------------------------
const iframeUrl = (website, id) => {
  const urls = {
    youtube: `https://www.youtube.com/embed/${id}?controls=0`,
    instagram: `https://www.instagram.com/p/${id}/embed`,
    tiktok: `https://www.tiktok.com/player/v1/${id}`,
    vimeo: `https://player.vimeo.com/video/${id}`
  }

  return urls[website];
}



// purpose:  scans string for media IDs from URLs
// arguments: string to scan for (text)
// returns:   id of given media (string) and what app it comes from (string)
// ------------------------------------------------------------------------
function getMedia(string) {
  let result;
  let youtube = /(youtu.*be.*)\/(watch\?v=|embed\/|v|shorts|)(.*?((?=[&#?])|$))/gm;
  result = youtube.exec(string);
  if(result){ return {
    id: result[3],
    app: 'youtube',
    embedUrl: `https://www.youtube.com/embed/${result[3]}`,
    url: `https://www.youtube.com/watch?v=${result[3]}`
  } }

  let instagram = /((?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([^/?#&]+)).*/g;
  result = instagram.exec(string);
  if(result){ return {
    id: result[2],
    app: 'instagram',
    embedUrl: `https://www.instagram.com/p/${result[2]}/embed`,
    url: `https://www.instagram.com/p/${result[2]}/`
  } }

  let vimeo = /(?:http|https)?:?\/?\/?(?:www\.)?(?:player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|)(\d+)(?:|\/\?)/g
  result = vimeo.exec(string);
  if(result){ return {
    id: result[1],
    app: 'vimeo',
    embedUrl: `https://player.vimeo.com/video/${result[1]}`,
    url: `https://vimeo.com/${result[1]}`
  } }

  let tiktok = /^.*https:\/\/(?:m|www|vm)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video)\/|\?shareId=|\&item_id=)(\d+))|\w+)/
  result = tiktok.exec(string);
  if(result){ console.log(result); return {
    id: result[2],
    app: 'tiktok',
    embedUrl: `https://www.tiktok.com/player/v1/${result[2]}`,
    url: `https://www.tiktok.com/@icecup1111/video/${result[2]}`
  } }
}


// purpose: Removes fields with thumbnails that has been used to tags generation with AI.
//          Resets this part of form to the original state.
// returns: void
// ------------------------------------------------------------------------
const removeThumbnailsFromPost = () => {
  // remove thumbnails
  const form = document.querySelector('form[data-tc="postForm"]');
  if (!form) {
    console.error('No post form found');
    return;
  }
  const oldInputNodes = form.querySelectorAll('input[data-form-image]');
  oldInputNodes.forEach((node) => node.remove());
};


// purpose:  when user paste any data scan for YouTube URLs in it,
//            place the URL in the input for DB storing and show a player
// ------------------------------------------------------------------------
contentInput.addEventListener('paste', event => {
  event.preventDefault();
  const pastedText = event.clipboardData.getData('text/plain');
  const formattedText = pastedText
   .replace(/\r?\n|\r/g, '<br>');
  document.execCommand('insertHTML', false, formattedText);

  const media = getMedia(event.clipboardData.getData('Text'));

  if (media.id) {
    playerContainer.classList.remove('!hidden');
    playerContainer.classList.remove('.mediaEmbedInstagram');

    if (media.app === 'instagram') {
      playerContainer.classList.add('mediaEmbedInstagram');
    }

    embedIframe.src = iframeUrl(media.app, media.id);
    mediaUrlInput.value = JSON.stringify(media);
  }
});



// purpose:  handles removing the media attachment from post
// ------------------------------------------------------------------------
removeMediaAttachmentButton.addEventListener('click', () => {
  playerContainer.classList.add('!hidden');

  embedIframe.src = '';
  mediaUrlInput.value = '';
});



// purpose:  resets the media attachment when post is submitted
// ------------------------------------------------------------------------
document.addEventListener('pos-feed-posting', () => {
  playerContainer.classList.add('!hidden');

  embedIframe.src = '';
  mediaUrlInput.value = '';

  removeThumbnailsFromPost();
});
