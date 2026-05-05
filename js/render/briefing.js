// briefing.js — renderiza o boletim do dia + handlers de reação/comentário/compartilhar/post.
import { setReaction, getReactions, setComment, getComment, getAllComments, hashItem } from '../store.js';
import { generatePost } from '../post-generator.js';
import { sharePayload } from './share.js';

const SECTION_ORDER = ['noroeste-sp', 'estado-sp', 'brasil', 'america-latina', 'mundo', 'agenda'];

function urgencyLabel(u) {
  return u === 'high' ? 'URGENTE' : u === 'medium' ? 'IMPORTANTE' : 'MONITORAR';
}
function urgencyClass(u) {
  return u === 'high' ? 'tag-urgent' : u === 'medium' ? 'tag-high' : 'tag-low';
}
function urgencyItemClass(u) {
  return u === 'high' ? 'urgency-high' : u === 'medium' ? 'urgency-medium' : 'urgency-low';
}

function escapeHTML(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function renderItem(date, item, sectionId) {
  const h = hashItem(item);
  const cityTags = (item.city_tags || []).map(c => `<span class="tag tag-city">📍 ${escapeHTML(c)}</span>`).join('');
  const topicTags = (item.topic_tags || []).map(t => `<span class="tag tag-topic">${escapeHTML(t)}</span>`).join('');
  return `
    <article class="item ${urgencyItemClass(item.urgency)}" data-hash="${h}" data-section="${sectionId}">
      <div class="item-tags">
        <span class="tag ${urgencyClass(item.urgency)}">${urgencyLabel(item.urgency)}</span>
        ${cityTags}
        ${topicTags}
      </div>
      <h3 class="item-headline">${escapeHTML(item.headline)}</h3>
      <p class="item-summary">${escapeHTML(item.summary)}</p>
      <div class="item-source">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.source)}</a>
      </div>
      <div class="item-actions">
        <button class="action-btn" data-act="saber" aria-label="Saber mais">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Saber+
        </button>
        <button class="action-btn" data-act="urgente" aria-label="Marcar urgente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 22h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Urgente
        </button>
        <button class="action-btn" data-act="post" aria-label="Gerar post">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Post
        </button>
        <button class="action-btn" data-act="comentar" aria-label="Comentar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Notas
        </button>
        <button class="action-btn" data-act="share" aria-label="Compartilhar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
    </article>
  `;
}

function renderSection(date, section, idx) {
  const items = (section.items || []).map(it => renderItem(date, it, section.id)).join('');
  const empty = (section.items || []).length === 0
    ? `<p class="muted" style="font-size:13px;padding:6px 2px">Sem itens relevantes hoje.</p>`
    : '';
  const analysis = section.analysis
    ? `<div class="analysis"><p>${escapeHTML(section.analysis)}</p></div>`
    : '';
  return `
    <section class="section" id="sec-${section.id}">
      <header class="section-head">
        <span class="section-num">${String(idx).padStart(2, '0')}</span>
        <h2 class="section-title">${escapeHTML(section.title)}</h2>
        <span class="section-count">${(section.items || []).length}</span>
      </header>
      ${analysis}
      ${items}
      ${empty}
    </section>
  `;
}

function renderTOC(sections) {
  const toc = document.getElementById('tocList');
  toc.innerHTML = sections.map((s, i) => `
    <li><a href="#sec-${s.id}" data-toc>
      <span class="toc-num">${String(i + 1).padStart(2, '0')}</span>
      <span>${escapeHTML(s.title)}</span>
    </a></li>
  `).join('');
  // Close drawer on click
  toc.querySelectorAll('[data-toc]').forEach(a => {
    a.addEventListener('click', () => document.getElementById('tocDrawer').classList.remove('is-open'));
  });
}

function readingTime(data) {
  const allText = JSON.stringify(data);
  const words = allText.split(/\s+/).length;
  return Math.max(2, Math.round(words / 220));
}

function countItems(data) {
  return (data.sections || []).reduce((acc, s) => acc + (s.items || []).length, 0);
}

function countUrgent(data) {
  return (data.sections || []).reduce((acc, s) =>
    acc + (s.items || []).filter(i => i.urgency === 'high').length, 0);
}

export function renderBriefing(data) {
  // Ordena seções
  const sections = SECTION_ORDER
    .map(id => (data.sections || []).find(s => s.id === id))
    .filter(Boolean);

  const top3 = (data.summary_top3 || []).map(t => `<li>${escapeHTML(t)}</li>`).join('');

  const readM = readingTime(data);
  const total = countItems(data);
  const urgent = countUrgent(data);

  const html = `
    <div class="hero">
      <div class="hero-meta">
        <span class="chip chip-brand">Boletim de hoje</span>
        <span class="chip">${escapeHTML(data.weekday)}</span>
        <span class="chip">${escapeHTML(data.date.split('-').reverse().join('/'))}</span>
      </div>
      <h1 class="hero-title">${escapeHTML(data.headline_overall || `Bom dia, Danilo. ${urgent > 0 ? urgent + ' alertas urgentes hoje.' : 'Resumo do dia.'}`)}</h1>
      <div class="hero-stats">
        <span><b>${total}</b> notícias</span>
        <span><b>${urgent}</b> urgentes</span>
        <span><b>~${readM} min</b> de leitura</span>
      </div>
    </div>

    ${top3 ? `
    <div class="top3">
      <div class="top3-label">★ Top do dia — leia em 30s</div>
      <ol class="top3-list">${top3}</ol>
    </div>` : ''}

    ${sections.map((s, i) => renderSection(data.date, s, i + 1)).join('')}

    <div class="export-bar">
      <div class="export-bar-info">
        <b id="feedbackCount">0 reações</b> registradas hoje. Quando quiser, envie seu feedback ao Marcelo em 1 toque.
      </div>
      <button class="export-btn" id="exportBtn">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A12 12 0 0 0 3.5 20.39L2 22l1.71-1.49A12 12 0 1 0 20.52 3.48zM12 21.05a9 9 0 0 1-4.6-1.27l-.33-.2-3.4.89.91-3.31-.21-.34A9 9 0 1 1 12 21.05zm5.16-6.66c-.28-.14-1.66-.82-1.92-.92s-.45-.14-.63.14-.73.92-.9 1.11-.33.21-.61.07a7.4 7.4 0 0 1-2.18-1.34 8.07 8.07 0 0 1-1.5-1.86c-.16-.28 0-.43.12-.57s.27-.34.41-.5.18-.27.27-.45a.51.51 0 0 0 0-.5c-.07-.14-.63-1.51-.86-2.07s-.46-.46-.63-.47h-.55a1.06 1.06 0 0 0-.77.36 3.22 3.22 0 0 0-1 2.4 5.61 5.61 0 0 0 1.18 3 12.84 12.84 0 0 0 4.91 4.34 16.66 16.66 0 0 0 1.64.6 4 4 0 0 0 1.81.12 3 3 0 0 0 1.94-1.37 2.43 2.43 0 0 0 .17-1.37c-.07-.13-.25-.2-.53-.34z"/></svg>
        Enviar feedback ao Marcelo (WhatsApp)
      </button>
    </div>

    <p class="muted text-center" style="font-size:12px;padding:8px 0 24px">
      Boletim preparado por Marcelo Suano · ${escapeHTML(data.date.split('-').reverse().join('/'))}
    </p>
  `;

  document.getElementById('briefingContent').innerHTML = html;
  renderTOC(sections);

  refreshReactionsUI(data.date);
  refreshFeedbackCount(data.date);
}

let __boundData = null;

export function attachItemHandlers(data) {
  __boundData = data;
  document.querySelectorAll('.item').forEach(card => {
    card.addEventListener('click', onItemClick);
  });
  document.getElementById('exportBtn').addEventListener('click', () => exportFeedback(data));
}

async function refreshReactionsUI(date) {
  const reactions = await getReactions(date);
  const map = {};
  reactions.forEach(r => { map[r.itemHash + '::' + r.type] = true; });
  document.querySelectorAll('.item').forEach(card => {
    const h = card.getAttribute('data-hash');
    card.querySelectorAll('.action-btn').forEach(btn => {
      const act = btn.getAttribute('data-act');
      if (act === 'saber' && map[h + '::saber']) {
        btn.classList.add('is-active');
      } else if (act === 'urgente' && map[h + '::urgente']) {
        btn.classList.add('is-active', 'urgent');
      } else {
        btn.classList.remove('is-active', 'urgent');
      }
    });
  });
}

async function refreshFeedbackCount(date) {
  const r = await getReactions(date);
  const c = await getAllComments(date);
  const total = r.length + c.length;
  const el = document.getElementById('feedbackCount');
  if (el) el.textContent = `${total} ${total === 1 ? 'reação/nota' : 'reações/notas'}`;
}

function findItemByHash(data, hash) {
  for (const s of (data.sections || [])) {
    for (const it of (s.items || [])) {
      if (hashItem(it) === hash) return { section: s, item: it };
    }
  }
  return null;
}

async function onItemClick(e) {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;
  const card = btn.closest('.item');
  const hash = card.getAttribute('data-hash');
  const act = btn.getAttribute('data-act');
  const found = findItemByHash(__boundData, hash);
  if (!found) return;
  const { item } = found;
  const date = __boundData.date;

  if (act === 'saber' || act === 'urgente') {
    const isOn = btn.classList.contains('is-active');
    await setReaction(date, hash, act, !isOn);
    btn.classList.toggle('is-active');
    if (act === 'urgente') btn.classList.toggle('urgent');
    window.showToast(isOn ? 'Removido' : (act === 'urgente' ? 'Marcado como urgente' : 'Marcado: saber mais'));
    refreshFeedbackCount(date);
    return;
  }
  if (act === 'post') {
    openPostModal(item);
    return;
  }
  if (act === 'comentar') {
    openCommentModal(date, hash);
    return;
  }
  if (act === 'share') {
    sharePayload({
      title: item.headline,
      text: `${item.headline}\n\nFonte: ${item.source}\n${item.url || ''}`,
      url: item.url || ''
    });
    return;
  }
}

function openPostModal(item) {
  const modal = document.getElementById('postModal');
  const ta = document.getElementById('postContent');
  let currentTab = 'instagram';
  function updateContent() {
    ta.value = generatePost(item, currentTab);
  }
  modal.classList.add('is-open');
  updateContent();
  modal.querySelectorAll('.post-tab').forEach(tab => {
    tab.onclick = () => {
      modal.querySelectorAll('.post-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      currentTab = tab.getAttribute('data-tab');
      updateContent();
    };
  });
  document.getElementById('postCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      window.showToast('Copiado!');
    } catch (e) { window.showToast('Não foi possível copiar'); }
  };
  document.getElementById('postShare').onclick = () => {
    sharePayload({ title: item.headline, text: ta.value, url: item.url || '' });
  };
}

async function openCommentModal(date, hash) {
  const modal = document.getElementById('commentModal');
  const ta = document.getElementById('commentArea');
  const existing = await getComment(date, hash);
  ta.value = existing ? existing.text : '';
  modal.classList.add('is-open');
  document.getElementById('commentSave').onclick = async () => {
    await setComment(date, hash, ta.value);
    modal.classList.remove('is-open');
    window.showToast(ta.value.trim() ? 'Nota salva' : 'Nota removida');
    refreshFeedbackCount(date);
  };
}

async function exportFeedback(data) {
  const reactions = await getReactions(data.date);
  const comments = await getAllComments(data.date);

  if (reactions.length === 0 && comments.length === 0) {
    window.showToast('Nenhuma reação para enviar ainda');
    return;
  }

  const lines = [`*Feedback do Danilo · ${data.date.split('-').reverse().join('/')}*`, ''];

  // Agrupa por hash
  const byHash = {};
  reactions.forEach(r => {
    (byHash[r.itemHash] ||= { types: [] }).types.push(r.type);
  });
  comments.forEach(c => {
    (byHash[c.itemHash] ||= { types: [] }).comment = c.text;
  });

  // Resolve nome dos itens
  for (const hash of Object.keys(byHash)) {
    const found = findItemByHash(data, hash);
    if (!found) continue;
    const tags = byHash[hash].types || [];
    const tagStr = tags.includes('urgente') ? '🔥 URGENTE' :
                   tags.includes('saber') ? '👁 Saber mais' : '';
    lines.push(`• ${tagStr ? tagStr + ' — ' : ''}${found.item.headline}`);
    if (found.item.url) lines.push(`  ${found.item.url}`);
    if (byHash[hash].comment) lines.push(`  💬 ${byHash[hash].comment}`);
    lines.push('');
  }

  lines.push('— Enviado pelo app Boletim');

  const text = lines.join('\n');
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
}
