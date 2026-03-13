'use client';

import { useState, useEffect, useCallback } from 'react';

interface PromptStatus {
  novidadesVisto: string | null;
  installPromptVisto: boolean;
  pushPromptVisto: boolean;
  pushAtivado: boolean;
}

let cachedStatus: PromptStatus | null = null;
let fetchPromise: Promise<PromptStatus> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function fetchStatus(): Promise<PromptStatus> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/user/prompt-status')
    .then(r => r.json())
    .then(data => {
      cachedStatus = data;
      fetchPromise = null;
      notifyListeners();
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      const fallback: PromptStatus = {
        novidadesVisto: null,
        installPromptVisto: true,
        pushPromptVisto: true,
        pushAtivado: true,
      };
      cachedStatus = fallback;
      notifyListeners();
      return fallback;
    });

  return fetchPromise;
}

export function usePromptStatus() {
  const [status, setStatus] = useState<PromptStatus | null>(cachedStatus);
  const [loading, setLoading] = useState(!cachedStatus);

  useEffect(() => {
    const update = () => {
      setStatus(cachedStatus);
      setLoading(false);
    };

    listeners.add(update);

    if (!cachedStatus) {
      fetchStatus();
    }

    return () => { listeners.delete(update); };
  }, []);

  const markSeen = useCallback(async (field: 'installPromptVisto' | 'pushPromptVisto' | 'novidadesVisto', value: any) => {
    const body: any = {};
    if (field === 'novidadesVisto') {
      body.novidadesVisto = value;
    } else {
      body[field] = true;
    }

    fetch('/api/user/prompt-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

    // Atualiza cache local imediatamente
    if (cachedStatus) {
      cachedStatus = { ...cachedStatus, [field]: value === undefined ? true : value };
      notifyListeners();
    }
  }, []);

  return { status, loading, markSeen };
}
