const stayForm = document.querySelector('#stay-form');

stayForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const guestName = new FormData(stayForm).get('guestName');
  stayForm.querySelector('.form-note').textContent = `Thanks, ${guestName}. Please call to confirm availability.`;
  stayForm.reset();
});
