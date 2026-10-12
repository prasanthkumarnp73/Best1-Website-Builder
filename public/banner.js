function showOffer(text) {
  document.querySelector('.business-offer-banner')?.remove();

  if (!document.querySelector('#business-offer-banner-styles')) {
    const style = document.createElement('style');
    style.id = 'business-offer-banner-styles';
    style.textContent = `
      @keyframes offerBannerEnter { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes offerBannerColor { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }
      @keyframes offerBannerShine { 0%, 35% { transform: translateX(-180%) skewX(-22deg); } 70%, 100% { transform: translateX(520%) skewX(-22deg); } }
      .business-offer-banner { position: relative; z-index: 20; display: flex; min-height: 92px; align-items: center; justify-content: center; gap: 18px; overflow: hidden; padding: 18px 68px; color: #fff; background: linear-gradient(105deg, #b74736, #d78332, #167763, #b74736); background-size: 260% 260%; box-shadow: 0 8px 22px rgba(27,49,39,.2); text-align: center; animation: offerBannerEnter .55s ease-out both, offerBannerColor 10s ease-in-out infinite; }
      .business-offer-banner::before { position: absolute; top: 0; bottom: 0; left: -24%; width: 18%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); content: ''; pointer-events: none; animation: offerBannerShine 5s ease-in-out infinite; }
      .business-offer-badge { position: relative; z-index: 1; flex: 0 0 auto; padding: 8px 11px; border: 1px solid rgba(255,255,255,.65); border-radius: 999px; background: rgba(33,42,32,.16); font: 700 10px/1 Arial,sans-serif; letter-spacing: 1.4px; white-space: nowrap; }
      .business-offer-message { position: relative; z-index: 1; max-width: 850px; font: 700 21px/1.35 Arial,sans-serif; overflow-wrap: anywhere; }
      .business-offer-close { position: absolute; top: 50%; right: 18px; z-index: 2; display: grid; width: 36px; height: 36px; place-items: center; transform: translateY(-50%); border: 1px solid rgba(255,255,255,.55); border-radius: 50%; color: #fff; background: rgba(33,42,32,.15); font: 400 22px/1 Arial,sans-serif; cursor: pointer; }
      .business-offer-close:hover { background: rgba(33,42,32,.34); }
      @media (max-width: 620px) { .business-offer-banner { min-height: 100px; flex-direction: column; gap: 9px; padding: 15px 52px 15px 16px; } .business-offer-message { font-size: 17px; } .business-offer-close { right: 11px; } }
      @media (prefers-reduced-motion: reduce) { .business-offer-banner, .business-offer-banner::before { animation: none; } }
    `;
    document.head.append(style);
  }

  const banner = document.createElement('aside');
  banner.className = 'business-offer-banner';
  banner.setAttribute('role', 'status');
  const badge = document.createElement('span');
  badge.className = 'business-offer-badge';
  badge.textContent = 'SPECIAL OFFER';
  const message = document.createElement('span');
  message.className = 'business-offer-message';
  message.textContent = String(text);
  const closeButton = document.createElement('button');
  closeButton.className = 'business-offer-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close special offer');
  closeButton.title = 'Close offer';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => banner.remove());
  banner.append(badge, message, closeButton);
  document.body.prepend(banner);
}
