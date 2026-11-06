// Cookieless page-view counting (GoatCounter: no cookies, no personal data). Empty = off.
// Shares the GoatCounter site with Simple Money Sheets; this site's paths all start /diy-project-calculators/.
window.SITE_ANALYTICS = { goatcounter: 'simplemoneysheets' };
(function () {
  const code = window.SITE_ANALYTICS.goatcounter;
  if (!code || !/\.github\.io$/.test(location.hostname)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.appendChild(s);
})();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
});
