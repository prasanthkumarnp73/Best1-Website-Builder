const cartCount = document.querySelector('#cart-count, #basket-count');
let itemCount = 0;

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    itemCount += 1;
    if (cartCount) cartCount.textContent = String(itemCount);
    button.textContent = 'Added to bag';
    window.setTimeout(() => { button.textContent = 'Add to bag'; }, 900);
  });
});
