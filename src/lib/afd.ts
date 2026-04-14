/**
 * Gerador de AFD (Arquivo Fonte de Dados) conforme Portaria 671/2021 do MTE.
 *
 * Layout simplificado (REP-P):
 * - Tipo 1 (cabeçalho): NSR(9) + Tipo(1) + CNPJ(14) + CEI(12) + RazaoSocial(150) + INPI(17) + DataIni(10) + DataFim(10) + DataGer(10) + HoraGer(5) + NumeroREP(17)
 * - Tipo 3 (marcação): NSR(9) + Tipo(1) + DataHora(19 - AAAA-MM-DDThh:mm-03:00) + PIS(12)
 * - Tipo 9 (trailer): NSR(9) + Total marcações(9) + Tipo(1)
 *
 * Observação: layout oficial da Portaria 671 tem mais tipos (2, 4, 5, 6, 7),
 * mas o tipo 3 (marcação) é o essencial para auditoria fiscal.
 */

function pad(str: string | number, size: number, char = '0', direction: 'left' | 'right' = 'left'): string {
  const s = String(str ?? '');
  if (s.length >= size) return s.slice(0, size);
  return direction === 'left' ? s.padStart(size, char) : s.padEnd(size, char);
}

function sanitize(str: string): string {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim();
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function formatTimeBR(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

/**
 * Formato ISO-like exigido pelo registro tipo 3 da AFD Portaria 671:
 * AAAA-MM-DDThh:mm-03:00 (com timezone)
 */
function formatISODateHourSP(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find(p => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}-03:00`;
}

export interface AFDInputs {
  empresa: {
    cnpj?: string | null;
    nome: string;
  };
  numeroREP: string; // 17 chars - pode ser o ID curto ou uma seq
  dataInicio: Date;
  dataFim: Date;
  pontos: Array<{
    dataHora: Date;
    usuarioId: string;
  }>;
  usuariosPorId: Record<string, { pis?: string | null; cpf?: string | null; nome: string }>;
}

export function gerarAFD({ empresa, numeroREP, dataInicio, dataFim, pontos, usuariosPorId }: AFDInputs): string {
  const agora = new Date();
  let nsr = 1;
  const linhas: string[] = [];

  // ========== Tipo 1 — Cabeçalho ==========
  const cnpj = pad(String(empresa.cnpj || '').replace(/\D/g, ''), 14);
  const cei = pad('', 12); // CEI opcional
  const razao = pad(sanitize(empresa.nome), 150, ' ', 'right');
  const inpi = pad('', 17, ' ', 'right'); // nº de registro INPI do software - opcional
  const numREP = pad(sanitize(numeroREP), 17, ' ', 'right');

  const cabecalho =
    pad(nsr++, 9) +
    '1' +
    cnpj +
    cei +
    razao +
    formatDateBR(dataInicio) +
    formatDateBR(dataFim) +
    formatDateBR(agora) +
    formatTimeBR(agora) +
    inpi +
    numREP;
  linhas.push(cabecalho);

  // ========== Tipo 3 — Marcações ordenadas por dataHora ==========
  const pontosOrdenados = [...pontos].sort(
    (a, b) => a.dataHora.getTime() - b.dataHora.getTime(),
  );

  let totalMarcacoes = 0;
  for (const p of pontosOrdenados) {
    const u = usuariosPorId[p.usuarioId];
    if (!u) continue;
    // PIS ou CPF com zero à esquerda (12 chars)
    const doc = (u.pis || u.cpf || '').replace(/\D/g, '');
    const pis = pad(doc, 12);
    const dt = formatISODateHourSP(p.dataHora);

    const linha = pad(nsr++, 9) + '3' + dt + pis;
    linhas.push(linha);
    totalMarcacoes++;
  }

  // ========== Tipo 9 — Trailer ==========
  const trailer = pad(nsr, 9) + pad(totalMarcacoes, 9) + '9';
  linhas.push(trailer);

  return linhas.join('\r\n') + '\r\n';
}
