(() => {
  const landing = document.getElementById('harmony-landing');
  if (!landing) return;

  for (const label of landing.querySelectorAll('nav a[href="#harmony-team"], #harmony-team h2')) {
    label.textContent = 'Ведущие тренинга';
  }

  const signup = landing.querySelector('#harmony-signup');
  signup?.querySelector('.lead')?.remove();

  // Keep Tilda's delegated cart handler on this page.
  const booking = signup?.querySelector('.booking');
  if (booking && !booking.querySelector('.harmony-payment-actions')) {
    const links = booking.querySelectorAll('a[href*="#order:"]');
    if (links.length) {
      const actions = document.createElement('div');
      actions.className = 'harmony-payment-actions';
      links[0].before(actions);
      for (const link of links) {
        const order = decodeURIComponent(new URL(link.href).hash);
        link.setAttribute('href', order);
        if (order.endsWith(' бронь=1000')) link.textContent = 'Забронировать место';
        if (order.endsWith(' тренинг=10000')) link.textContent = 'Оплатить участие';
        actions.append(link);
      }

      const style = document.createElement('style');
      style.textContent = `
        @media (max-width: 760px) {
          #harmony-landing .booking .harmony-payment-actions {
            display: grid;
            gap: .75rem;
            margin-top: 1.4rem;
          }
          #harmony-landing .booking .harmony-payment-actions .button {
            margin: 0;
          }
        }
      `;
      landing.prepend(style);
    }
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

  if (!booking) return;
  const contact = document.createElement('div');
  contact.style.marginTop = '1rem';
  const hint = document.createElement('p');
  hint.textContent = 'Есть вопросы перед записью? Оставьте заявку, и мы свяжемся с вами.';
  contact.append(hint);
  addButton(contact, 'harmony-question-signup');
  booking.append(contact);
})();
