// publish.js — PUT do boletim em /briefings/<date>.json e atualização do index.json
// usando GitHub Contents API.
import { getCreds } from './auth.js';

const API = 'https://api.github.com';

function b64(str) {
  // Suporta UTF-8
  return btoa(unescape(encodeURIComponent(str)));
}

async function ghGetFile(path) {
  const c = getCreds();
  const url = `${API}/repos/${c.owner}/${c.repo}/contents/${path}?ref=${encodeURIComponent(c.branch)}`;
  const r = await fetch(url, {
    headers: { 'Authorization': `Bearer ${c.token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

async function ghPutFile(path, content, message, sha) {
  const c = getCreds();
  const url = `${API}/repos/${c.owner}/${c.repo}/contents/${path}`;
  const body = {
    message,
    content: b64(content),
    branch: c.branch
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${c.token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`PUT ${path} → ${r.status} ${t}`);
  }
  return r.json();
}

function countItems(json) {
  return (json.sections || []).reduce((acc, s) => acc + (s.items || []).length, 0);
}
function countUrgent(json) {
  return (json.sections || []).reduce((acc, s) =>
    acc + (s.items || []).filter(i => i.urgency === 'high').length, 0);
}

export async function publishBriefing(json) {
  const date = json.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data inválida');

  const path = `briefings/${date}.json`;
  const existing = await ghGetFile(path);
  await ghPutFile(
    path,
    JSON.stringify(json, null, 2),
    `boletim: publicação de ${date}`,
    existing?.sha
  );

  // Atualiza index.json
  const idxFile = await ghGetFile('briefings/index.json');
  let idxJson;
  if (idxFile) {
    try {
      idxJson = JSON.parse(decodeURIComponent(escape(atob(idxFile.content.replace(/\n/g, '')))));
    } catch (e) {
      idxJson = { briefings: [] };
    }
  } else {
    idxJson = { briefings: [] };
  }

  const summary = {
    date,
    weekday: json.weekday || '',
    headline: json.headline_overall || '',
    items_count: countItems(json),
    urgent_count: countUrgent(json)
  };

  const others = (idxJson.briefings || []).filter(b => b.date !== date);
  idxJson.briefings = [summary, ...others].sort((a, b) => (a.date < b.date ? 1 : -1));

  await ghPutFile(
    'briefings/index.json',
    JSON.stringify(idxJson, null, 2),
    `boletim: index atualizado para ${date}`,
    idxFile?.sha
  );
}
