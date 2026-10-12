const cartCount = document.querySelector('#cart-count');
let itemCount = 0;

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    itemCount += 1;
    cartCount.textContent = itemCount;
    button.textContent = 'Added to bag';
    window.setTimeout(() => { button.textContent = 'Add to bag'; }, 900);
  });
});
