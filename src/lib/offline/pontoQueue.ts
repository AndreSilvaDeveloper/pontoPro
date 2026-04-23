/**
 * Fila de pontos offline — guardados em IndexedDB quando não há internet.
 * Sincronizados automaticamente quando o navegador volta online.
 */

const DB_NAME = 'workid-offline';
const DB_VERSION = 1;
const STORE = 'pontos-pendentes';

export interface PontoPendente {
  id?: number;
  usuarioId: string;
  latitude: number | null;
  longitude: number | null;
  fotoBase64: string | null;
  tipo: string;
  dataHoraOffline: string; // ISO timestamp — momento real do clique
  tentativas: number;
  ultimoErro?: string;
  criadoEm: number; // ms epoch
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não suportado'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function enqueuePonto(item: Omit<PontoPendente, 'id' | 'tentativas' | 'criadoEm'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const full: Omit<PontoPendente, 'id'> = {
      ...item,
      tentativas: 0,
      criadoEm: Date.now(),
    };
    const req = store.add(full);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function listPendentes(): Promise<PontoPendente[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PontoPendente[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removerPendente(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function atualizarPendente(id: number, patch: Partial<PontoPendente>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as PontoPendente | undefined;
      if (!current) { resolve(); return; }
      const putReq = store.put({ ...current, ...patch });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Tenta enviar uma batida pendente para o servidor.
 * Retorna true se deu certo (e o item pode ser removido da fila).
 */
export async function sincronizarUm(item: PontoPendente): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch('/api/funcionario/ponto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuarioId: item.usuarioId,
        latitude: item.latitude,
        longitude: item.longitude,
        fotoBase64: item.fotoBase64,
        tipo: item.tipo,
        dataHoraOffline: item.dataHoraOffline,
      }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, erro: data?.erro || `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, erro: e?.message || 'Falha de rede' };
  }
}

/**
 * Drena toda a fila. Remove os que sincronizaram com sucesso.
 * Retorna quantos foram sincronizados e quantos falharam.
 */
export async function sincronizarTodos(): Promise<{ ok: number; falhou: number }> {
  const pendentes = await listPendentes();
  let ok = 0;
  let falhou = 0;
  for (const item of pendentes) {
    if (!item.id) continue;
    const res = await sincronizarUm(item);
    if (res.ok) {
      await removerPendente(item.id);
      ok++;
    } else {
      await atualizarPendente(item.id, {
        tentativas: item.tentativas + 1,
        ultimoErro: res.erro,
      });
      falhou++;
    }
  }
  return { ok, falhou };
}
