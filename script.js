const announcement = document.querySelector('#announcement');
const closeButton = document.querySelector('.close');

closeButton.addEventListener('click', () => {
  announcement.classList.add('hidden');
});
