// tts.js — Web Speech API (SpeechSynthesis) em pt-BR. Fallback elegante.
let speaking = false;
let utterances = [];

function buildScript(data) {
  const lines = [];
  lines.push(`Bom dia. Boletim do dia ${data.date.split('-').reverse().join(' de ')}, ${data.weekday || ''}.`);
  if (data.summary_top3 && data.summary_top3.length) {
    lines.push('Top do dia.');
    data.summary_top3.forEach(t => lines.push(t));
  }
  (data.sections || []).forEach(s => {
    if (!s.items || s.items.length === 0) return;
    lines.push(`Seção: ${s.title}.`);
    if (s.analysis) lines.push(`Análise do Marcelo: ${s.analysis}`);
    s.items.forEach(it => {
      const tag = it.urgency === 'high' ? 'Alerta urgente:' : it.urgency === 'medium' ? 'Importante:' : 'Para acompanhar:';
      lines.push(`${tag} ${it.headline}.`);
      if (it.summary) lines.push(it.summary);
    });
  });
  lines.push('Fim do boletim.');
  return lines;
}

function findVoicePtBR() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find(v => /pt[-_]BR/i.test(v.lang)) ||
         voices.find(v => /pt/i.test(v.lang)) ||
         null;
}

function stop() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  speaking = false;
  utterances = [];
}

export function initTTS(data) {
  const btn = document.getElementById('ttsBtn');
  if (!btn) return;
  btn.onclick = () => {
    if (!('speechSynthesis' in window)) {
      window.showToast('Áudio não disponível neste navegador');
      return;
    }
    if (speaking) {
      stop();
      window.showToast('Áudio parado');
      btn.classList.remove('is-active');
      return;
    }
    const voice = findVoicePtBR();
    if (!voice) {
      // Sometimes voices load async
      speechSynthesis.onvoiceschanged = () => {
        // Retry
        speechSynthesis.onvoiceschanged = null;
        play(data);
      };
      // Force voice load on iOS
      try { speechSynthesis.getVoices(); } catch(e) {}
      window.showToast('Carregando voz…');
      setTimeout(() => play(data), 300);
      return;
    }
    play(data);
  };
}

function play(data) {
  const voice = findVoicePtBR();
  const lines = buildScript(data);
  speaking = true;
  document.getElementById('ttsBtn').classList.add('is-active');
  utterances = lines.map(line => {
    const u = new SpeechSynthesisUtterance(line);
    if (voice) u.voice = voice;
    u.lang = 'pt-BR';
    u.rate = 1.05;
    u.pitch = 1.0;
    return u;
  });
  let i = 0;
  function next() {
    if (i >= utterances.length) {
      speaking = false;
      document.getElementById('ttsBtn').classList.remove('is-active');
      return;
    }
    const u = utterances[i++];
    u.onend = next;
    u.onerror = next;
    speechSynthesis.speak(u);
  }
  next();
}

// Cancel on page unload
window.addEventListener('beforeunload', stop);
