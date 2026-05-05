// app.js — Bootstrap + roteador hash + carregamento de boletins.
import { renderBriefing, attachItemHandlers } from './render/briefing.js';
import { renderArchive, attachArchiveHandlers } from './render/archive.js';
import { initTTS } from './render/tts.js';
import { prefs } from './store.js';

const TZ = 'America/Sao_Paulo';

function todayInSP() {
  // Retorna YYYY-MM-DD em America/Sao_Paulo
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

const WEEKDAYS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
function weekdayInSP(dateISO) {
  // dateISO = "YYYY-MM-DD"
  const d = new Date(dateISO + 'T12:00:00-03:00');
  return WEEKDAYS[d.getDay()];
}

async function fetchJSON(url) {
  const sep = url.includes('?') ? '&' : '?';
  const r = await fetch(`${url}${sep}v=${Date.now()}`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

async function loadBriefing(date) {
  try {
    return await fetchJSON(`briefings/${date}.json`);
  } catch (e) {
    return null;
  }
}

async function loadIndex() {
  try {
    return await fetchJSON('briefings/index.json');
  } catch (e) {
    return { briefings: [] };
  }
}

// Apply theme
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#F8FAFC' : '#0B1220');
}

function showOnboardingIfNeeded() {
  if (prefs.getOnbDone()) return;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) { prefs.setOnbDone(); return; }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // Mostra onboarding em iOS não-instalado (e qualquer nav primeira vez).
  if (!isIOS && /Android/.test(navigator.userAgent) === false) {
    // Em desktops, oculta para não atrapalhar.
    prefs.setOnbDone();
    return;
  }
  document.getElementById('onboarding').classList.add('is-shown');
}
document.getElementById('onbSkip').addEventListener('click', () => {
  prefs.setOnbDone();
  document.getElementById('onboarding').classList.remove('is-shown');
});

// Toast util (global)
let toastTimer = null;
window.showToast = function(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2000);
};

// Reading progress
function trackProgress() {
  const bar = document.getElementById('progressBar');
  function upd() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? (window.scrollY / h) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, p)) + '%';
  }
  window.addEventListener('scroll', upd, { passive: true });
  upd();
}

// Router
async function route() {
  const hash = location.hash || '#/hoje';
  const briefingView = document.getElementById('briefingView');
  const archiveView  = document.getElementById('archiveView');

  if (hash.startsWith('#/arquivo')) {
    briefingView.classList.add('hidden');
    archiveView.classList.remove('hidden');
    const idx = await loadIndex();
    renderArchive(idx);
    attachArchiveHandlers(idx);
    document.getElementById('brandSub').textContent = `Arquivo · ${idx.briefings.length} boletins`;
    return;
  }

  if (hash.startsWith('#/boletim/')) {
    const date = hash.replace('#/boletim/', '').slice(0, 10);
    archiveView.classList.add('hidden');
    briefingView.classList.remove('hidden');
    await openBriefing(date);
    return;
  }

  // default: hoje
  archiveView.classList.add('hidden');
  briefingView.classList.remove('hidden');
  await openBriefing(todayInSP());
}

async function openBriefing(date) {
  const data = await loadBriefing(date);
  const sub = document.getElementById('brandSub');
  if (!data) {
    sub.textContent = `Sem boletim em ${date}`;
    document.getElementById('briefingContent').innerHTML = `
      <div class="hero">
        <div class="hero-meta"><span class="chip">Aguardando publicação</span></div>
        <h1 class="hero-title">Marcelo ainda não publicou o boletim de ${date}.</h1>
        <p class="muted">Quando o boletim do dia for publicado, ele aparece aqui automaticamente.
        Você pode revisar boletins anteriores no <a href="#/arquivo">arquivo</a>.</p>
      </div>`;
    return;
  }
  data.weekday = data.weekday || weekdayInSP(data.date);
  sub.textContent = `${capitalize(data.weekday)} · ${prettyDate(data.date)}`;
  renderBriefing(data);
  attachItemHandlers(data);
  initTTS(data);
  // Restaurar scroll
  const y = prefs.getScroll(data.date);
  if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  // Salvar scroll periodicamente
  let saveTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => prefs.setScroll(data.date, window.scrollY), 200);
  }, { passive: true });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function prettyDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Theme button
document.getElementById('themeBtn').addEventListener('click', () => {
  const cur = prefs.getTheme();
  const next = cur === 'dark' ? 'light' : 'dark';
  prefs.setTheme(next);
  applyTheme(next);
});

// Archive button
document.getElementById('archiveBtn').addEventListener('click', () => {
  location.hash = '#/arquivo';
});

// TOC drawer
const tocFab = document.getElementById('tocFab');
const tocDrawer = document.getElementById('tocDrawer');
tocFab.addEventListener('click', () => tocDrawer.classList.add('is-open'));
tocDrawer.addEventListener('click', (e) => {
  if (e.target === tocDrawer) tocDrawer.classList.remove('is-open');
});

// Modal closers
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', () => {
    const id = b.getAttribute('data-close');
    document.getElementById(id).classList.remove('is-open');
  });
});

// Service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Init
applyTheme(prefs.getTheme());
showOnboardingIfNeeded();
trackProgress();
window.addEventListener('hashchange', route);
route();
