const cartCount = document.querySelector('#cart-count, #basket-count');
const selectedProducts = [];

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    const productName = button.dataset.product
      || button.closest('.product, .catalog-product')?.querySelector('h3')?.textContent?.trim();
    if (productName) selectedProducts.push(productName);
    if (cartCount) cartCount.textContent = String(selectedProducts.length);
    button.textContent = 'Added to bag';
    window.setTimeout(() => { button.textContent = 'Add to bag'; }, 900);
  });
});

document.querySelectorAll('[data-checkout]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (!selectedProducts.length) return;
    const target = new URL(link.href, window.location.href);
    const message = `Hello, I would like to ask about: ${selectedProducts.join(', ')}`;
    if (target.hostname === 'wa.me') {
      target.searchParams.set('text', message);
    } else if (target.protocol === 'mailto:') {
      target.searchParams.set('subject', 'Product enquiry');
      target.searchParams.set('body', message);
    } else {
      return;
    }
    event.preventDefault();
    window.location.href = target.toString();
  });
});
