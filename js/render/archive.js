// archive.js — Lista e busca em boletins anteriores.
const SECTION_LABELS = {
  'noroeste-sp': 'Noroeste SP',
  'estado-sp': 'Estado SP',
  'brasil': 'Brasil',
  'america-latina': 'América Latina',
  'mundo': 'Mundo',
  'agenda': 'Agenda'
};

function escapeHTML(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

let __cache = null; // {date -> json}
async function fetchBriefing(date) {
  if (__cache && __cache[date]) return __cache[date];
  try {
    const r = await fetch(`briefings/${date}.json?v=${Date.now()}`);
    if (!r.ok) return null;
    const data = await r.json();
    (__cache ||= {})[date] = data;
    return data;
  } catch (e) { return null; }
}

let __index = null;
let __filter = { topic: null, query: '' };

export async function renderArchive(idx) {
  __index = idx;
  const list = document.getElementById('archiveList');
  list.innerHTML = `<p class="muted">Carregando boletins…</p>`;

  // Carrega todos os boletins do índice (em paralelo) — para busca full-text leve
  const briefings = await Promise.all(
    (idx.briefings || []).map(b => fetchBriefing(b.date).then(d => ({ meta: b, data: d })))
  );
  const valid = briefings.filter(b => b.data);

  __cache_full = valid;
  renderResults();
  renderFilters();
}

let __cache_full = [];

function renderFilters() {
  const row = document.getElementById('filterRow');
  const topics = [
    { id: null, label: 'Todos' },
    { id: 'noroeste-sp', label: 'Noroeste SP' },
    { id: 'estado-sp', label: 'Estado SP' },
    { id: 'brasil', label: 'Brasil' },
    { id: 'america-latina', label: 'A. Latina' },
    { id: 'mundo', label: 'Mundo' },
    { id: 'agenda', label: 'Agenda' }
  ];
  row.innerHTML = topics.map(t => `
    <button class="filter-pill ${__filter.topic === t.id ? 'is-active' : ''}" data-topic="${t.id || ''}">
      ${t.label}
    </button>
  `).join('');
  row.querySelectorAll('[data-topic]').forEach(btn => {
    btn.onclick = () => {
      __filter.topic = btn.getAttribute('data-topic') || null;
      renderFilters();
      renderResults();
    };
  });
}

function matchesFilter(item, sectionId) {
  if (__filter.topic && sectionId !== __filter.topic) return false;
  const q = (__filter.query || '').toLowerCase().trim();
  if (!q) return true;
  const hay = `${item.headline} ${item.summary} ${(item.city_tags || []).join(' ')} ${(item.topic_tags || []).join(' ')} ${item.source || ''}`.toLowerCase();
  return hay.includes(q);
}

function renderResults() {
  const list = document.getElementById('archiveList');
  const results = [];

  __cache_full.forEach(({ meta, data }) => {
    (data.sections || []).forEach(sec => {
      (sec.items || []).forEach(item => {
        if (matchesFilter(item, sec.id)) {
          results.push({ date: data.date, weekday: data.weekday, sectionId: sec.id, item });
        }
      });
    });
  });

  if (results.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <p>Nenhum item encontrado.</p>
        <p class="muted" style="font-size:13px">Tente outras palavras-chave ou remova filtros.</p>
      </div>`;
    return;
  }

  // Agrupa por data
  const byDate = {};
  results.forEach(r => { (byDate[r.date] ||= []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();

  list.innerHTML = dates.map(date => {
    const cards = byDate[date].map(r => `
      <div class="archive-card">
        <div class="archive-date">${prettyDate(date)} · ${escapeHTML(SECTION_LABELS[r.sectionId] || r.sectionId)}</div>
        <h3 class="archive-headline">${escapeHTML(r.item.headline)}</h3>
        <p class="archive-summary">${escapeHTML(r.item.summary)}</p>
        <div class="archive-meta">
          <span>${escapeHTML(r.item.source || '')}</span>
          ${r.item.url ? `<a href="${escapeHTML(r.item.url)}" target="_blank" rel="noopener">abrir fonte ↗</a>` : ''}
          <a href="#/boletim/${date}">ver boletim do dia</a>
        </div>
      </div>
    `).join('');
    return cards;
  }).join('');
}

function prettyDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function attachArchiveHandlers() {
  const input = document.getElementById('searchInput');
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      __filter.query = input.value;
      renderResults();
    }, 150);
  });
}
