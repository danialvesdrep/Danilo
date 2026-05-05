// editor.js — Editor visual do boletim + publicação via GitHub API.
import { getCreds } from './auth.js';
import { publishBriefing } from './publish.js';

const SECTIONS = [
  { id: 'noroeste-sp',    title: 'Cidades do Noroeste de SP' },
  { id: 'estado-sp',      title: 'Estado de São Paulo' },
  { id: 'brasil',         title: 'Política e Economia do Brasil' },
  { id: 'america-latina', title: 'América Latina' },
  { id: 'mundo',          title: 'Mundo' },
  { id: 'agenda',         title: 'Agenda · Câmara, Senado e ALESP' }
];

const URGENCY_OPTS = [
  { v: 'high',   label: '🔴 Urgente' },
  { v: 'medium', label: '🟡 Importante' },
  { v: 'low',    label: '🟢 Monitorar' }
];

let __state = { date: todayInSP(), overall: '', top3: '', sections: SECTIONS.map(s => ({ ...s, items: [], analysis: '' })) };

function todayInSP() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

function escapeHTML(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function renderSections() {
  const c = document.getElementById('sectionsContainer');
  c.innerHTML = __state.sections.map((s, sIdx) => `
    <div class="admin-form">
      <div class="admin-section-title">${escapeHTML(s.title)}</div>

      <label class="admin-label">Análise do consultor (opcional)</label>
      <textarea class="admin-textarea" data-field="analysis" data-section="${sIdx}" placeholder="Sua análise sobre essa seção…">${escapeHTML(s.analysis || '')}</textarea>

      <div id="items-${sIdx}" style="margin-top:10px"></div>

      <button class="btn-add" data-action="add-item" data-section="${sIdx}">+ Adicionar item</button>
    </div>
  `).join('');

  __state.sections.forEach((s, sIdx) => {
    const itemsEl = document.getElementById(`items-${sIdx}`);
    itemsEl.innerHTML = (s.items || []).map((it, iIdx) => itemRow(sIdx, iIdx, it)).join('');
  });

  bindHandlers();
}

function itemRow(sIdx, iIdx, item) {
  return `
    <div class="admin-item" data-section="${sIdx}" data-item="${iIdx}">
      <div class="admin-grid">
        <select class="admin-select" data-field="urgency">
          ${URGENCY_OPTS.map(o => `<option value="${o.v}" ${item.urgency === o.v ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <input class="admin-input" data-field="headline" placeholder="Manchete" value="${escapeHTML(item.headline || '')}" />
        <textarea class="admin-textarea" data-field="summary" placeholder="Resumo de 2-3 linhas">${escapeHTML(item.summary || '')}</textarea>
        <input class="admin-input" data-field="source" placeholder="Fonte (ex: Estadão)" value="${escapeHTML(item.source || '')}" />
        <input class="admin-input" data-field="url" placeholder="URL da fonte" value="${escapeHTML(item.url || '')}" />
        <input class="admin-input" data-field="city_tags" placeholder="Cidades / tags geo (vírgula)" value="${escapeHTML((item.city_tags || []).join(', '))}" />
        <input class="admin-input" data-field="topic_tags" placeholder="Tópicos (ex: agronegócio, segurança)" value="${escapeHTML((item.topic_tags || []).join(', '))}" />
      </div>
      <div class="admin-row">
        <button class="btn-remove" data-action="remove-item">Remover item</button>
      </div>
    </div>
  `;
}

function bindHandlers() {
  document.querySelectorAll('[data-action="add-item"]').forEach(b => {
    b.onclick = () => {
      const s = parseInt(b.getAttribute('data-section'), 10);
      __state.sections[s].items.push({ urgency: 'medium', headline: '', summary: '', source: '', url: '', city_tags: [], topic_tags: [] });
      renderSections();
    };
  });
  document.querySelectorAll('[data-action="remove-item"]').forEach(b => {
    b.onclick = () => {
      const wrap = b.closest('.admin-item');
      const s = parseInt(wrap.getAttribute('data-section'), 10);
      const i = parseInt(wrap.getAttribute('data-item'), 10);
      __state.sections[s].items.splice(i, 1);
      renderSections();
    };
  });
  document.querySelectorAll('.admin-item input, .admin-item textarea, .admin-item select').forEach(el => {
    el.onchange = () => readState();
    el.oninput = () => readState();
  });
  document.querySelectorAll('[data-field="analysis"]').forEach(el => {
    el.oninput = () => {
      const s = parseInt(el.getAttribute('data-section'), 10);
      __state.sections[s].analysis = el.value;
    };
  });
}

function readState() {
  document.querySelectorAll('.admin-item').forEach(wrap => {
    const sIdx = parseInt(wrap.getAttribute('data-section'), 10);
    const iIdx = parseInt(wrap.getAttribute('data-item'), 10);
    const item = __state.sections[sIdx].items[iIdx];
    item.urgency   = wrap.querySelector('[data-field="urgency"]').value;
    item.headline  = wrap.querySelector('[data-field="headline"]').value.trim();
    item.summary   = wrap.querySelector('[data-field="summary"]').value.trim();
    item.source    = wrap.querySelector('[data-field="source"]').value.trim();
    item.url       = wrap.querySelector('[data-field="url"]').value.trim();
    item.city_tags  = wrap.querySelector('[data-field="city_tags"]').value.split(',').map(s => s.trim()).filter(Boolean);
    item.topic_tags = wrap.querySelector('[data-field="topic_tags"]').value.split(',').map(s => s.trim()).filter(Boolean);
  });
}

function buildJSON() {
  readState();
  const top3 = (document.getElementById('top3').value || '').split('\n').map(s => s.trim()).filter(Boolean);
  return {
    date: __state.date,
    weekday: getWeekday(__state.date),
    headline_overall: document.getElementById('overall').value.trim(),
    summary_top3: top3,
    sections: __state.sections.map(s => ({
      id: s.id,
      title: s.title,
      analysis: s.analysis || '',
      items: s.items.filter(it => it.headline)
    }))
  };
}

function getWeekday(iso) {
  const WD = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const d = new Date(iso + 'T12:00:00-03:00');
  return WD[d.getDay()];
}

function updateTargetUI() {
  const c = getCreds();
  const path = `briefings/${__state.date}.json`;
  document.getElementById('targetDateChip').textContent = __state.date;
  document.getElementById('editDate').value = __state.date;
  document.getElementById('targetPath').textContent = c ? `${c.owner}/${c.repo}@${c.branch}:${path}` : path;
}

async function loadExisting() {
  try {
    const r = await fetch(`briefings/${__state.date}.json?v=${Date.now()}`);
    if (!r.ok) return;
    const data = await r.json();
    __state.overall = data.headline_overall || '';
    __state.top3 = (data.summary_top3 || []).join('\n');
    document.getElementById('overall').value = __state.overall;
    document.getElementById('top3').value = __state.top3;
    __state.sections = SECTIONS.map(s => {
      const found = (data.sections || []).find(x => x.id === s.id);
      return { ...s, items: found?.items || [], analysis: found?.analysis || '' };
    });
    renderSections();
  } catch (e) { /* sem boletim ainda */ }
}

function init() {
  updateTargetUI();
  renderSections();
  loadExisting();

  document.getElementById('editDate').addEventListener('change', (e) => {
    __state.date = e.target.value;
    updateTargetUI();
  });
  document.getElementById('loadDate').addEventListener('click', () => {
    __state.sections = SECTIONS.map(s => ({ ...s, items: [], analysis: '' }));
    document.getElementById('overall').value = '';
    document.getElementById('top3').value = '';
    renderSections();
    loadExisting();
  });

  document.getElementById('publishBtn').addEventListener('click', async () => {
    const json = buildJSON();
    document.getElementById('previewContent').textContent = JSON.stringify(json, null, 2);
    document.getElementById('previewModal').classList.add('is-open');
  });

  document.getElementById('confirmPublish').addEventListener('click', async () => {
    const json = buildJSON();
    const btn = document.getElementById('confirmPublish');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    try {
      await publishBriefing(json);
      window.showToast('Publicado com sucesso!');
      document.getElementById('previewModal').classList.remove('is-open');
    } catch (e) {
      window.showToast('Erro ao publicar: ' + (e.message || ''));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirmar e publicar';
    }
  });
}

document.addEventListener('admin:login', init);
