// Fila offline de conferencias de inventario (item 1), persistida em localStorage
// para sobreviver a recargas de pagina e quedas de conexao. NAO usa service
// worker (o app shell offline ficou como follow-up) — o objetivo aqui e nao
// perder bipes feitos sem sinal e sincroniza-los quando a conexao voltar.

const keyFor = (inventoryId) => `patrimonios_offline_inv_${inventoryId}`;

export function loadQueue(inventoryId) {
  try {
    const raw = localStorage.getItem(keyFor(inventoryId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(inventoryId, queue) {
  try {
    localStorage.setItem(keyFor(inventoryId), JSON.stringify(queue));
  } catch {
    /* quota cheia / modo privado — best-effort */
  }
}

// Enfileira (ou substitui, pelo item_id) uma conferencia pendente.
export function enqueueScan(inventoryId, entry) {
  const queue = loadQueue(inventoryId).filter((e) => e.item_id !== entry.item_id);
  queue.push(entry);
  saveQueue(inventoryId, queue);
  return queue.length;
}

export function clearQueue(inventoryId) {
  try { localStorage.removeItem(keyFor(inventoryId)); } catch { /* noop */ }
}

export function queueCount(inventoryId) {
  return loadQueue(inventoryId).length;
}
