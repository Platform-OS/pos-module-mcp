const backdropComponentWrapper = document.querySelector('[data-styleguide-component="Backdrop"]');
if (backdropComponentWrapper) {
  const backdropComponent = backdropComponentWrapper.children[0];
  const componentDemoContent = backdropComponent.outerHTML;
  backdropComponent.remove();

  const iframe = document.createElement('iframe');
  backdropComponentWrapper.prepend(iframe);

  iframe.setAttribute("style","height:100%;width:100%;");
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(`
  <html>
    <head>${document.head.innerHTML}</head>
    <body>${componentDemoContent}</body>
  </html>
  `);
  iframe.contentWindow.document.close();
};
