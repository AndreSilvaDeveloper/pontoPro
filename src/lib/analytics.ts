/**
 * Disparo de eventos para o dataLayer (GTM) e gtag (GA4 direto).
 * Funciona mesmo sem GTM/GA4 instalados — apenas no-op.
 */

type DataLayerEvent = {
  event: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

/**
 * Empurra um evento pro dataLayer do GTM.
 * Chamar sempre no client (componente 'use client').
 *
 * Ex: trackEvent('lead_demo_booked', { plano: 'STARTER' })
 */
export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    // Também envia direto pra GA4 caso GTM não esteja redirecionando
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch (err) {
    console.error('[analytics] trackEvent falhou:', err);
  }
}

/**
 * Conversão de lead — dispara em GA4 + Meta Pixel + GTM dataLayer.
 * Usar quando alguém preenche formulário, agenda demo ou cadastra.
 */
export function trackLead(params: { tipo: string; valor?: number; moeda?: string } & Record<string, unknown>) {
  trackEvent('lead', params);
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: params.tipo,
        value: params.valor ?? 0,
        currency: params.moeda ?? 'BRL',
      });
    }
  } catch (err) {
    console.error('[analytics] trackLead (Meta) falhou:', err);
  }
}
