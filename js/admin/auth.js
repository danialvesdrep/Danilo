// auth.js — Login GitHub PAT (localStorage). MVP, suficiente para uso pessoal.
const KEY = 'gh-creds';

export function getCreds() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch (e) { return null; }
}
export function setCreds(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function clearCreds() { localStorage.removeItem(KEY); }

function show(viewId) {
  ['loginView', 'editorView'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-shown');
  setTimeout(() => el.classList.remove('is-shown'), 2500);
}
window.showToast = showToast;

document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const owner = document.getElementById('ghOwner').value.trim();
  const repo = document.getElementById('ghRepo').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';
  const token = document.getElementById('ghToken').value.trim();
  if (!owner || !repo || !token) {
    showToast('Preencha todos os campos');
    return;
  }
  // Valida tentando GET ao repo
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!r.ok) {
      showToast('Token ou repositório inválido');
      return;
    }
    setCreds({ owner, repo, branch, token });
    document.getElementById('userSub').textContent = `${owner}/${repo}`;
    show('editorView');
    document.dispatchEvent(new CustomEvent('admin:login'));
  } catch (e) {
    showToast('Falha de conexão');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  clearCreds();
  show('loginView');
  document.getElementById('userSub').textContent = 'Não conectado';
});

// Modal closers
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', () => {
    const id = b.getAttribute('data-close');
    document.getElementById(id).classList.remove('is-open');
  });
});

// Boot
const creds = getCreds();
if (creds) {
  document.getElementById('userSub').textContent = `${creds.owner}/${creds.repo}`;
  show('editorView');
  setTimeout(() => document.dispatchEvent(new CustomEvent('admin:login')), 0);
} else {
  show('loginView');
}
