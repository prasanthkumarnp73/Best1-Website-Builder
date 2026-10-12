function showOffer(text) {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes offerSlideIn {
      from { opacity: 0; transform: translateY(-100%); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes offerColorShift {
      from { background-position: 0% 50%; }
      to { background-position: 100% 50%; }
    }
    .business-offer-banner {
      position: relative;
      z-index: 10;
      padding: 14px 20px;
      color: #fff;
      background: linear-gradient(100deg, #e66f50, #e9a63c, #23866b);
      background-size: 200% 200%;
      text-align: center;
      font: 700 15px/1.4 Arial, sans-serif;
      animation: offerSlideIn .55s ease-out both, offerColorShift 7s ease-in-out infinite alternate;
    }
  `;
  document.head.append(style);

  const banner = document.createElement('div');
  banner.className = 'business-offer-banner';
  banner.setAttribute('role', 'status');
  banner.textContent = text;
  document.body.prepend(banner);
}
