/**
 * Máscara de telefone BR: (XX) XXXXX-XXXX (móvel) ou (XX) XXXX-XXXX (fixo).
 * Aceita string com qualquer formatação e retorna formatado.
 */
export function mascaraTelefone(valor: string): string {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Validação simples — telefone BR precisa ter 10 ou 11 dígitos.
 */
export function telefoneValido(valor: string): boolean {
  const d = (valor || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}
