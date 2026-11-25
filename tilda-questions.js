(() => {
  const landing = document.getElementById('harmony-landing');
  if (!landing) return;

  for (const label of landing.querySelectorAll('nav a[href="#harmony-team"], #harmony-team h2')) {
    label.textContent = 'Ведущие тренинга';
  }

  // Use Tilda's delegated cart handler for orders on this page.
  for (const link of landing.querySelectorAll('.booking a[href*="#order:"]')) {
    const order = new URL(link.href).hash;
    link.setAttribute('href', decodeURIComponent(order));
  }

  if (landing.querySelector('.harmony-question')) return;

  const source = 'https://psy-sng.ru/harmony';
  const originalForm = source + '#rec6082405201';
  const email = 'mailto:psy-sng.ru@yandex.ru?subject=' + encodeURIComponent('Вопрос о практикуме «Сексуальная гармонизация»');

  function findPopup() {
    return document.querySelector('.t-popup[data-tooltip-hook="#popup:vopros"]')?.closest('.t-rec');
  }

  function fallback() {
    const current = new URL(location.href);
    return /(^|\.)psy-sng\.ru$/.test(current.hostname) &&
      current.pathname.replace(/\/$/, '') === '/harmony' ? email : originalForm;
  }

  function addButton(container, className) {
    if (!container) return;
    const button = document.createElement('a');
    button.className = 'button outline harmony-question ' + className;
    button.textContent = 'Задать вопрос';
    button.href = fallback();

    button.addEventListener('click', event => {
      const popup = findPopup();
      if (!popup || typeof window.t702_showPopup !== 'function') return;
      event.preventDefault();
      window.t702_showPopup(popup.id.replace(/^rec/, ''));
    });
    container.append(button);
  }

  addButton(landing.querySelector('.hero .actions'), 'harmony-question-hero');

  const booking = landing.querySelector('.booking');
  if (!booking) return;
  const contact = document.createElement('div');
  contact.style.marginTop = '1rem';
  const hint = document.createElement('p');
  hint.textContent = 'Есть вопросы перед записью? Оставьте заявку, и организаторы свяжутся с вами.';
  contact.append(hint);
  addButton(contact, 'harmony-question-signup');
  booking.append(contact);
})();
