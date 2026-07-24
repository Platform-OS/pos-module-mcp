import hljs from 'highlight.js/lib/core';

import 'highlight.js/styles/atom-one-light.css';

import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import ruby from 'highlight.js/lib/languages/ruby';
import twig from 'highlight.js/lib/languages/twig';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('twig', twig); // liquid
hljs.registerLanguage('xml', xml);

document.querySelectorAll('pre > code').forEach((block) => {
  hljs.highlightBlock(block);
});
