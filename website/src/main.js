/**
 * PorcTrack Website — main.js
 * Scroll reveal · Counter animation · Nav scroll state · Mobile menu
 */

// ── Scroll Reveal ─────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ── Counter Animation ─────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  if (isNaN(target)) return;
  let start = 0;
  const duration = 1200;
  const startTime = performance.now();
  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll('[data-target]').forEach((el) => counterObserver.observe(el));

// ── Nav scroll state ──────────────────────────────────────────
const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  if (currentScroll > 20) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
  lastScroll = currentScroll;
}, { passive: true });

// ── Mobile menu ───────────────────────────────────────────────
const burger = document.getElementById('burger');
const navMobile = document.getElementById('navMobile');

burger?.addEventListener('click', () => {
  const isOpen = burger.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(isOpen));
  navMobile.classList.toggle('open', isOpen);
  navMobile.setAttribute('aria-hidden', String(!isOpen));
});

// Close on link click
document.querySelectorAll('.nm-link').forEach((link) => {
  link.addEventListener('click', () => {
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    navMobile.classList.remove('open');
    navMobile.setAttribute('aria-hidden', 'true');
  });
});

// ── Smooth scroll polyfill for anchor links ───────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
