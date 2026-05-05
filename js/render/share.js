// share.js — Web Share API com fallback WhatsApp / clipboard.
export async function sharePayload({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  // Fallback: WhatsApp
  const composed = [text, url].filter(Boolean).join('\n');
  const wa = `https://wa.me/?text=${encodeURIComponent(composed)}`;
  window.open(wa, '_blank', 'noopener');
}
