const profileComponents = document.querySelectorAll('[data-styleguide-component="Header profile"] > div');
profileComponents.forEach(profileComponent => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute("style","height:50px; width:180px; background: white; padding-left:20px; padding-top:10px;");
  profileComponent.parentNode.replaceChild(wrapper, profileComponent);
  wrapper.appendChild(profileComponent);
});
