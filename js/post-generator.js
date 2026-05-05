// post-generator.js — Sugere texto pronto alinhado ao posicionamento Tarcísio/Bolsonaro.
// Carrega config/posicionamento.json sob demanda.

let __config = null;
async function loadConfig() {
  if (__config) return __config;
  try {
    const r = await fetch('config/posicionamento.json?v=' + Date.now());
    __config = await r.json();
  } catch (e) {
    __config = {
      candidato: { nome: 'Danilo Campetti', cargo_pleiteado: 'Deputado Estadual — São Paulo' }
    };
  }
  return __config;
}

// Fallback síncrono (config pode não ter chegado no primeiro toque) — usa estrutura mínima.
function syncConfig() { return __config || { candidato: { nome: 'Danilo Campetti' } }; }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function tone(item) {
  const u = item.urgency || 'low';
  if (u === 'high')   return ['Atenção:', 'Alerta:', 'Importante:'];
  if (u === 'medium') return ['Vale a leitura:', 'Acompanhe:', 'Para acompanhar:'];
  return ['Para o radar:', 'Vale registrar:', 'Para o conhecimento:'];
}

function topicCues(item) {
  const text = `${item.headline} ${item.summary} ${(item.topic_tags || []).join(' ')}`.toLowerCase();
  const cues = [];
  if (/agro|soja|milho|safra|produtor/.test(text)) cues.push('agronegócio');
  if (/seguran|crime|polícia|pm /.test(text))      cues.push('segurança');
  if (/saúde|hospital|sus/.test(text))             cues.push('saúde');
  if (/economia|pib|inflação|selic|emprego/.test(text)) cues.push('economia');
  if (/israel|hamas|irã|gaza/.test(text))          cues.push('israel');
  if (/eua|trump|estados unidos/.test(text))       cues.push('eua');
  if (/educação|escola/.test(text))                cues.push('educação');
  if (/tarcísio/.test(text))                       cues.push('tarcisio');
  if (/bolsonaro|pl /.test(text))                  cues.push('bolsonaro');
  return cues;
}

function positioningPhrase(item) {
  const cues = topicCues(item);
  const p = [];
  if (cues.includes('agronegócio')) p.push('O agro é a força que move o Noroeste paulista. Precisamos de menos imposto e mais previsibilidade para o produtor rural.');
  if (cues.includes('segurança'))   p.push('Sigo defendendo polícia forte, lei dura e respaldo total a quem está na linha de frente — como faz o governador Tarcísio.');
  if (cues.includes('saúde'))       p.push('Saúde é gestão. Quero replicar no interior o que dá certo: foco no paciente, fila zerada e aliados de Tarcísio entregando resultado.');
  if (cues.includes('economia'))    p.push('Quem paga a conta da farra é o trabalhador. Defendo responsabilidade fiscal, menos imposto e Estado eficiente.');
  if (cues.includes('israel'))      p.push('Solidariedade total a Israel. O Brasil precisa estar do lado certo da história, ao lado das democracias.');
  if (cues.includes('eua'))         p.push('A parceria com os EUA é estratégica para o Brasil — mercados, tecnologia e segurança.');
  if (cues.includes('tarcisio'))    p.push('Tarcísio prova todo dia que SP funciona quando há gestão. É a esse modelo que estou somando como deputado.');
  if (cues.includes('bolsonaro'))   p.push('Sigo firme com o presidente Bolsonaro nos valores que sempre defendi: liberdade, família e Brasil acima de tudo.');
  if (p.length === 0) p.push('Vamos seguir trabalhando para que a voz do Noroeste paulista seja ouvida em São Paulo.');
  return pick(p);
}

function trim280(s) {
  if (s.length <= 280) return s;
  return s.slice(0, 277) + '…';
}

function clean(s) { return (s || '').trim().replace(/\s+/g, ' '); }

export function generatePost(item, channel) {
  // garante config carregada de modo lazy
  loadConfig();
  const cfg = syncConfig();
  const cand = cfg.candidato || {};
  const opener = pick(tone(item));
  const positioning = positioningPhrase(item);
  const headline = clean(item.headline);
  const summary  = clean(item.summary);
  const source   = clean(item.source || '');
  const url      = item.url || '';

  if (channel === 'twitter') {
    const text = `${opener} ${headline}.\n\n${positioning}`;
    const tail = url ? `\n\n📰 ${source}: ${url}` : '';
    return trim280(text + tail);
  }

  if (channel === 'whatsapp') {
    return [
      `🇧🇷 *${cand.nome || 'Danilo Campetti'}*`,
      ``,
      `${opener} ${headline}.`,
      summary ? summary : '',
      ``,
      positioning,
      ``,
      url ? `Fonte: ${source} — ${url}` : `Fonte: ${source}`,
      ``,
      `— ${cand.nome || 'Danilo Campetti'} · ${cand.cargo_pleiteado || 'Deputado Estadual SP'}`
    ].filter(Boolean).join('\n');
  }

  // Instagram (default)
  const hashtags = ['#DaniloCampetti', '#NoroestePaulista', '#SãoPaulo', '#Brasil'];
  const cues = topicCues(item);
  if (cues.includes('agronegócio')) hashtags.push('#Agro', '#AgroÉBrasil');
  if (cues.includes('segurança'))   hashtags.push('#Segurança', '#PMSP');
  if (cues.includes('israel'))      hashtags.push('#Israel');
  if (cues.includes('tarcisio'))    hashtags.push('#Tarcísio');

  return [
    `${opener} ${headline}.`,
    ``,
    summary,
    ``,
    positioning,
    ``,
    url ? `📰 ${source} → ${url}` : `📰 ${source}`,
    ``,
    hashtags.join(' ')
  ].filter(Boolean).join('\n');
}
