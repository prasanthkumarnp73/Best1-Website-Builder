document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) {
      event.preventDefault();
      section.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
