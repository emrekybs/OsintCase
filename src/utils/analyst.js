// Bu cihazdaki analistin adı. İşlem kaydına ve delil teslim kayıtlarına
// otomatik yazılır. Sadece bu tarayıcıda saklanır.
const KEY = 'osint-tool:analyst';

export function getAnalyst() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setAnalyst(name) {
  try {
    localStorage.setItem(KEY, (name ?? '').trim());
  } catch {}
}
