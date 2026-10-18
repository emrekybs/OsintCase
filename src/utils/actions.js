// Ribbon → ağ görünümü komut köprüsü. Ağ sekmesi (InfoTab) bu olayı dinler.
export const ACTION_EVENT = 'oc:action';

export function runAction(name) {
  window.dispatchEvent(new CustomEvent(ACTION_EVENT, { detail: { name } }));
}
