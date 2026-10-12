const reservationForm = document.querySelector('#reservation-form');

reservationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const guestName = new FormData(reservationForm).get('guestName');
  reservationForm.querySelector('.form-note').textContent = `Thanks, ${guestName}. Please call to confirm your table.`;
  reservationForm.reset();
});
