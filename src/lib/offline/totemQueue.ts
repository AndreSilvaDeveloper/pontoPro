/**
 * Fila de pontos offline do TOTEM — guardados em IndexedDB quando não há internet.
 * Diferença chave em relação ao pontoQueue do funcionário: aqui o totem NÃO sabe
 * quem é a pessoa (não tem login). A identificação é feita pelo backend via AWS
 * Rekognition na hora do sync. Se o AWS não reconhecer após N tentativas, o item
 * é descartado (anti-loop infinito) e logado.
 */

const DB_NAME = 'workid-totem-offline';
const DB_VERSION = 1;
const STORE = 'totem-pontos-pendentes';

const MAX_TENTATIVAS = 5;

export interface TotemPontoPendente {
  id?: number;
  token: string;
  fotoBase64: string;
  dataHoraOffline: string; // ISO timestamp — momento real da batida
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

export async function enqueueTotemPonto(
  item: Omit<TotemPontoPendente, 'id' | 'tentativas' | 'criadoEm'>,
): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const full: Omit<TotemPontoPendente, 'id'> = {
      ...item,
      tentativas: 0,
      criadoEm: Date.now(),
    };
    const req = store.add(full);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function listPendentesTotem(): Promise<TotemPontoPendente[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as TotemPontoPendente[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removerPendenteTotem(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function atualizarPendenteTotem(
  id: number,
  patch: Partial<TotemPontoPendente>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as TotemPontoPendente | undefined;
      if (!current) {
        resolve();
        return;
      }
      const putReq = store.put({ ...current, ...patch });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Tenta sincronizar uma batida pendente.
 * Retorna:
 *  - { ok: true }                      → criar ponto OK, remover da fila
 *  - { ok: false, naoIdentificado: true } → AWS não reconheceu (tentar de novo até MAX_TENTATIVAS)
 *  - { ok: false, descartar: true }    → erro fatal (token inválido, addon inativo) → remover
 *  - { ok: false, erro: '...' }        → erro de rede/servidor (tentar de novo)
 */
export async function sincronizarUmTotem(
  item: TotemPontoPendente,
): Promise<{ ok: boolean; naoIdentificado?: boolean; descartar?: boolean; erro?: string }> {
  try {
    const res = await fetch('/api/totem/bater-ponto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${item.token}`,
      },
      body: JSON.stringify({
        fotoBase64: item.fotoBase64,
        dataHoraOffline: item.dataHoraOffline,
      }),
    });
    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));

    // Erros fatais: token inválido, addon inativo, empresa bloqueada → descartar
    if (res.status === 401 || res.status === 402 || res.status === 403) {
      return { ok: false, descartar: true, erro: data?.erro || `HTTP ${res.status}` };
    }

    // Não identificado pelo AWS → tentar de novo até MAX_TENTATIVAS
    if (res.status === 404) {
      return { ok: false, naoIdentificado: true, erro: data?.erro || 'nao_identificado' };
    }

    return { ok: false, erro: data?.erro || `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, erro: e?.message || 'Falha de rede' };
  }
}

/**
 * Drena toda a fila do totem (ordem de inserção, processado um por vez para
 * o backend determinar o tipo de ponto correto baseado nos anteriores).
 */
export async function sincronizarTodosTotem(): Promise<{
  ok: number;
  falhou: number;
  descartado: number;
}> {
  const pendentes = await listPendentesTotem();
  let ok = 0;
  let falhou = 0;
  let descartado = 0;

  for (const item of pendentes) {
    if (!item.id) continue;
    const res = await sincronizarUmTotem(item);

    if (res.ok) {
      await removerPendenteTotem(item.id);
      ok++;
      continue;
    }

    if (res.descartar) {
      await removerPendenteTotem(item.id);
      descartado++;
      console.warn('[totemQueue] descartado:', item.id, res.erro);
      continue;
    }

    const novasTentativas = item.tentativas + 1;
    if (novasTentativas >= MAX_TENTATIVAS) {
      // Não identificado depois de N tentativas → descartar e logar
      await removerPendenteTotem(item.id);
      descartado++;
      console.warn(
        '[totemQueue] descartado por excesso de tentativas:',
        item.id,
        item.dataHoraOffline,
        res.erro,
      );
    } else {
      await atualizarPendenteTotem(item.id, {
        tentativas: novasTentativas,
        ultimoErro: res.erro,
      });
      falhou++;
    }
  }

  return { ok, falhou, descartado };
}
