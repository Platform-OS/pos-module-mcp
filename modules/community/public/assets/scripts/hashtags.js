const HASHTAG_SEARCH_API = '/api/tags/search.json';
const AUTOSUGGEST_DEBOUNCE_DELAY_MS = 200;

// async debounce helper
const debounce = (fn, delay = 500) => {
  let timeoutId;
  return async function (...args) {
    clearTimeout(timeoutId);
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await fn(...args);
        resolve(result);
      }, delay);
    });
  };
};

// promise memoize helper
const memoizePromiseFn = (fn) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    cache.set(
      key,
      fn(...args).catch((error) => {
        // Delete cache entry if API call fails
        cache.delete(key);
        return Promise.reject(error);
      })
    );

    return cache.get(key);
  };
};

// hashtags search api call
const getSuggestions = (query) => {
  return fetch(`${HASHTAG_SEARCH_API}?query=${query}`)
    .then((response) => response.json())
    .then((json) => json.results);
};

// memoized search
const memoizedGetSuggestions = memoizePromiseFn(getSuggestions);
// debounced search
const debouncedGetSuggestions = debounce(memoizedGetSuggestions, AUTOSUGGEST_DEBOUNCE_DELAY_MS);

// parse and hashtagify content
const rewriteContentWithHashtags = (input) => {
  const cleanHtml = input.replace(/<br>/g, "__br__")
    .replace(/(?:\r\n|\r|\n)/g, '__br__');

  return new DOMParser().parseFromString(cleanHtml, 'text/html').body.innerText
    .replace(/__br__/g, "<br>")
    .replace(
      /(^|\W)#([\p{L}\d\-]+)/gu,
      (_, $1, $2) => `${$1}<hashtag>#${$2}</hashtag>`
    );
};

// get cursor position within a DOM element
const getCursorPosition = (parent, node, offset, stat) => {
  if (stat.done) return stat;

  if (parent.childNodes.length === 0) {
    stat.pos += parent.textContent.length;
  } else {
    for (const childNode of parent.childNodes) {
      if (childNode === node) {
        stat.pos += offset;
        stat.done = true;
        return stat;
      } else {
        getCursorPosition(childNode, node, offset, stat);
      }
    }
  }
  return stat;
};

// set cursor position within a DOM element
const setCursorPosition = (parent, range, stat) => {
  if (stat.done) return range;

  if (parent.childNodes.length === 0) {
    if (parent.textContent.length >= stat.pos) {
      range.setStart(parent, stat.pos);
      stat.done = true;
    } else {
      stat.pos = stat.pos - parent.textContent.length;
    }
  } else {
    for (const childNode of parent.childNodes) {
      setCursorPosition(childNode, range, stat);
    }
  }
  return range;
};

// parse and update content in the contentEditable element
const parseAndUpdateContent = (sourceElement) => {
  const input = sourceElement.innerHTML;
  if (!sourceElement.innerText) return;

  const sel = window.getSelection();
  const { focusNode, focusOffset } = sel;

  // Get cursor position within the contentEditable element
  const pos = getCursorPosition(sourceElement, focusNode, focusOffset, {
    pos: 0,
    done: false
  });

  if (focusOffset === 0) pos.pos += 0.5;

  // Process hashtags and update content
  const output = rewriteContentWithHashtags(input);

  sourceElement.innerHTML = output;

  // Restore cursor position
  sel.removeAllRanges();
  const range = setCursorPosition(sourceElement, document.createRange(), {
    pos: pos.pos,
    done: false
  });
  range.collapse(true);
  sel.addRange(range);
};

// get the hashtag node at the current caret position
const getHashtagNodeAtCaret = () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const node =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentNode
        : range.startContainer;

    return node?.closest ? node.closest("hashtag") : false;
  }
  return false;
};

const initialize = (element) => {
  element.setAttribute('data-pos-initialized', true);

  // main DOM nodes
  const contentEditable = element.querySelector("[data-hashtag-input]");
  const formInput = element.querySelector("[data-post-input]");
  const autosuggestField = element.querySelector("[data-hashtag-autosuggest]");
  const parentForm = element.closest('form');

  parentForm?.addEventListener("reset", () => {
    contentEditable.innerHTML = formInput.value = "";
  });

  let activeHashtagNode = null;

  // hide the autosuggest field
  const hideAutosuggestField = () => {
    autosuggestField.style.display = "none";
    autosuggestField.setAttribute('aria-label', '');
    autosuggestField.setAttribute('aria-hidden', true);
  };

  // show the autosuggest field
  const showAutosuggestField = () => {
    autosuggestField.style.display = "block";
    autosuggestField.setAttribute('aria-hidden', false);
  };

  // reset autosuggest field
  const resetAutosuggestField = () => {
    hideAutosuggestField();
    const output = `
		<li>Loading...</li>
	`;
    autosuggestField.innerHTML = output;
  };

  // rebuild autosuggest field options with new suggestions
  const rebuildAutosuggestOptions = (suggestions) => {
    autosuggestField.innerHTML = '';

    if (!activeHashtagNode || !suggestions.length) return;

    autosuggestField.setAttribute(
      'aria-label',
      `${suggestions.length} suggestions for ${activeHashtagNode.innerText}`
    );
    suggestions.map(
      (s) => {
        const option = document.createElement('li');
        let postCount = '';
        if (s.post_count === '1') {
          postCount = '1 post';
        } else if (s.post_count) {
          postCount = `${s.post_count} posts`;
        }
        option.classList.add('autosuggest__option', 'flex', 'justify-between');
        option.setAttribute('data-value', `#${s.name}`);
        option.setAttribute('data-option', '');
        option.setAttribute('role', 'option');
        option.innerHTML = `#${s.name} <span>${postCount}</span>`;
        option.addEventListener('click', (e) => {
          autosuggestChangeHandler(e.target.getAttribute('data-value'));
        });
        autosuggestField.appendChild(option);
      }
    );
  };

  // update the currently active hashtag with the suggestion
  const autosuggestChangeHandler = (value) => {
    if (value && activeHashtagNode) {
      // add suggestion to the hashtag node
      activeHashtagNode.innerText = value;
      // sync input values
      formInput.value = contentEditable.innerText;

      // Set cursor to the end of the updated hashtag
      const range = document.createRange();
      range.selectNodeContents(activeHashtagNode);
      range.collapse(false);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // Set focus back to contenteditable
    contentEditable.focus();
    resetAutosuggestField();
  };

  // handle autosuggest logic for a hashtag node
  const autosuggestForHashtagNode = async () => {
    if (!activeHashtagNode) return;
    const hashtag = activeHashtagNode.innerText.replace(/^#/, "");
    if (hashtag.length < 1) return;

    let suggestions = await debouncedGetSuggestions(hashtag);
    if (!suggestions.find(s => s.name === hashtag)) {
      suggestions = [{
        name: hashtag
      },
      ...suggestions];
    }

    rebuildAutosuggestOptions(suggestions);
    showAutosuggestField();
  };

  const handleKeyUp = (e) => {
    if (activeHashtagNode) {
      switch (e.keyCode) {
        case 9:
        case 40:
          autosuggestField.focus();
          selectAutosuggestOption(1);
          break;
        case 27:
          resetAutosuggestField();
          break;
        default:
          handleCaretChange();
      }
    } else {
      handleCaretChange();
    }
  };

  // handle caret position changes
  const handleCaretChange = () => {
    const hashtagNode = getHashtagNodeAtCaret();
    if (!hashtagNode) {
      activeHashtagNode = null;
      resetAutosuggestField();
      contentEditable.focus();
      return;
    }
    if (activeHashtagNode !== hashtagNode) {
      activeHashtagNode = hashtagNode;
      autosuggestForHashtagNode();
    }
  };

  const handleContentEditableBlur = () => {
    if (document.activeElement !== autosuggestField) {
      resetAutosuggestField();
    }

    if (contentEditable.innerText === '' && contentEditable.hasAttribute('resize-on-focus')) {
      contentEditable.classList.add('h-11');
      contentEditable.classList.remove('h-28');
    }
  };

  const handleContentEditableFocus = () => {
    if (contentEditable.innerText === '' && contentEditable.hasAttribute('resize-on-focus')) {
      contentEditable.classList.add('h-28');
      contentEditable.classList.remove('h-11');
    }
  };

  const selectAutosuggestOption = (direction) => {
    const currentOption = autosuggestField.querySelector('[data-selected]');
    if (!currentOption) {
      autosuggestField.querySelector('[data-option]')?.setAttribute('data-selected', true);
      return;
    }
    switch (direction) {
      case 1:
        if (currentOption.nextSibling) {
          currentOption.removeAttribute('data-selected');
          currentOption.nextSibling.setAttribute('data-selected', true);
        }
        break;
      case -1:
        if (currentOption.previousSibling) {
          currentOption.removeAttribute('data-selected');
          currentOption.previousSibling.setAttribute('data-selected', true);
        }
        break;
    }
  };

  const selectCurrentAutosuggestOption = () => {
    const currentOption = autosuggestField.querySelector('[data-selected]');
    autosuggestChangeHandler(currentOption?.getAttribute('data-value'));
  };

  const handleAutosuggestKeyDown = (e) => {
    switch (e.keyCode) {
      case 38:
        selectAutosuggestOption(-1);
        e.preventDefault();
        break;
      case 40:
        selectAutosuggestOption(1);
        e.preventDefault();
        break;
      case 32:
      case 13:
        selectCurrentAutosuggestOption();
        e.preventDefault();
        break;
      case 27:
        hideAutosuggestField();
        contentEditable.focus();
        break;
    }
  };

  // event handler for input changes in contentEditable
  const inputHandler = (event) => {
    if (event.data ||
      (event.inputType !== "insertLineBreak" && event.inputType !== "insertParagraph" && event.inputType !== "deleteContentBackward" && event.inputType !== "deleteContentForward")) {
      parseAndUpdateContent(event.target);
    }
    formInput.value = event.target.innerText;
  };

  // initialize hashtag functionality
  const hashTag = (contentEditable, input) => {
    // default value
    contentEditable.innerHTML = rewriteContentWithHashtags(input.value);
    // event listeners
    contentEditable.addEventListener("input", inputHandler);
    contentEditable.addEventListener("focus", handleContentEditableFocus);
    contentEditable.addEventListener("blur", () => setTimeout(handleContentEditableBlur, 250));
    contentEditable.addEventListener("keyup", handleKeyUp);
    contentEditable.addEventListener("click", handleCaretChange);
    contentEditable.addEventListener("keydown", (e) => {
      if (e.keyCode === 9 && activeHashtagNode) {
        e.preventDefault();
        autosuggestField.focus();
        selectAutosuggestOption(1);
      }
      if (e.keyCode === 13 && e.target.hasAttribute('data-single-line')) {
        e.preventDefault();
      }
    });
    autosuggestField.addEventListener("keydown", handleAutosuggestKeyDown);
    autosuggestField.addEventListener("blur", resetAutosuggestField);
  };

  hashTag(contentEditable, formInput);
};

const run = () => {
  const hashtagNodes = document.querySelectorAll(`[data-pos-component="hashtag"]:not([data-pos-initialized])`);
  hashtagNodes.forEach(node => {
    initialize(node);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  run();
  if (window.posComponents) {
    const originalPosComponentsInit = window.posComponents.initialize;
    window.posComponents.initialize = (c) => {
      originalPosComponentsInit(c);
      run();
    };
  }
});
