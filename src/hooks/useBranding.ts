'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Branding {
  nomeExibicao: string;
  logoUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
}

const DEFAULTS: Branding = {
  nomeExibicao: 'WorkID',
  logoUrl: null,
  corPrimaria: '#7c3aed',
  corSecundaria: '#4f46e5',
};

let cache: Branding | null = null;
let fetching = false;

// Para páginas internas (após login) — busca branding baseado na empresa do usuário
export function useBranding() {
  const [branding, setBranding] = useState<Branding>(cache || DEFAULTS);

  useEffect(() => {
    if (cache || fetching) return;
    fetching = true;

    axios.get('/api/user/branding')
      .then(res => {
        if (res.data.branding) {
          cache = { ...DEFAULTS, ...res.data.branding };
        } else {
          cache = DEFAULTS;
        }
        setBranding(cache!);
      })
      .catch(() => { cache = DEFAULTS; })
      .finally(() => { fetching = false; });
  }, []);

  return branding;
}
