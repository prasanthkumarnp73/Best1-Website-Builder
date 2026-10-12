const basketCount = document.querySelector('#basket-count');
let itemCount = 0;

document.querySelectorAll('[data-add]').forEach((button) => {
  button.addEventListener('click', () => {
    itemCount += 1;
    basketCount.textContent = itemCount;
    button.textContent = 'Added';
    window.setTimeout(() => { button.textContent = 'Add to basket'; }, 900);
  });
});
