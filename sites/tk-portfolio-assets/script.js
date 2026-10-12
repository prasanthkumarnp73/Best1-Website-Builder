const contactForm = document.querySelector('#contact-form');

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const senderName = new FormData(contactForm).get('senderName');
  const note = contactForm.querySelector('.form-note');
  note.textContent = `Thanks, ${senderName}. Please use the contact details above to send your inquiry.`;
  note.classList.add('is-success');
  contactForm.reset();
});
