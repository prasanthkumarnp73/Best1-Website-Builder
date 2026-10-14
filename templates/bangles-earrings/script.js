const cartCount = document.querySelector('#cart-count, #basket-count');
const checkoutLink = document.querySelector('[data-checkout]');
const selectedProducts = [];

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.dataset.product || button.closest('.product, .catalog-product')?.querySelector('h3')?.textContent?.trim();
    if (name) selectedProducts.push(name);
    if (cartCount) cartCount.textContent = String(selectedProducts.length);
    button.textContent = 'Added to bag';
    window.setTimeout(() => { button.textContent = 'Add to bag'; }, 900);
  });
});

document.querySelectorAll('[data-checkout]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!selectedProducts.length) return;
    const baseUrl = new URL(link.href, window.location.href);
    const message = `Hello, I would like to ask about: ${selectedProducts.join(', ')}`;
    if (baseUrl.hostname === 'wa.me') {
      baseUrl.searchParams.set('text', message);
    } else if (baseUrl.protocol === 'mailto:') {
      baseUrl.searchParams.set('subject', 'Product enquiry');
      baseUrl.searchParams.set('body', message);
    } else {
      return;
    }
    event.preventDefault();
    window.location.href = baseUrl.toString();
  });
});
