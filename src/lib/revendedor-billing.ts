// Calcula o valor da fatura mensal de um revendedor com base nos usuários ativos

export interface FaixaPreco {
  faixa1Limite: number;  // até X usuários
  faixa1Valor: number;   // R$/usuário
  faixa2Limite: number;  // até X usuários
  faixa2Valor: number;   // R$/usuário
  faixa3Valor: number;   // R$/usuário (acima de faixa2Limite)
  minimoMensal: number;
}

export interface FaturaRevendedor {
  totalUsuarios: number;
  detalheFaixas: Array<{ faixa: string; qtd: number; valorUnit: number; subtotal: number }>;
  subtotal: number;
  minimoMensal: number;
  total: number;
}

export function calcularFaturaRevendedor(
  totalUsuarios: number,
  config: FaixaPreco
): FaturaRevendedor {
  const { faixa1Limite, faixa1Valor, faixa2Limite, faixa2Valor, faixa3Valor, minimoMensal } = config;

  const detalheFaixas: FaturaRevendedor['detalheFaixas'] = [];
  let restante = totalUsuarios;

  // Faixa 1: até faixa1Limite
  const qtdFaixa1 = Math.min(restante, faixa1Limite);
  if (qtdFaixa1 > 0) {
    detalheFaixas.push({
      faixa: `Até ${faixa1Limite} usuários`,
      qtd: qtdFaixa1,
      valorUnit: faixa1Valor,
      subtotal: Number((qtdFaixa1 * faixa1Valor).toFixed(2)),
    });
    restante -= qtdFaixa1;
  }

  // Faixa 2: de faixa1Limite+1 até faixa2Limite
  const qtdFaixa2 = Math.min(restante, faixa2Limite - faixa1Limite);
  if (qtdFaixa2 > 0) {
    detalheFaixas.push({
      faixa: `De ${faixa1Limite + 1} a ${faixa2Limite} usuários`,
      qtd: qtdFaixa2,
      valorUnit: faixa2Valor,
      subtotal: Number((qtdFaixa2 * faixa2Valor).toFixed(2)),
    });
    restante -= qtdFaixa2;
  }

  // Faixa 3: acima de faixa2Limite
  if (restante > 0) {
    detalheFaixas.push({
      faixa: `Acima de ${faixa2Limite} usuários`,
      qtd: restante,
      valorUnit: faixa3Valor,
      subtotal: Number((restante * faixa3Valor).toFixed(2)),
    });
  }

  const subtotal = Number(detalheFaixas.reduce((s, f) => s + f.subtotal, 0).toFixed(2));
  const total = Math.max(subtotal, minimoMensal);

  return {
    totalUsuarios,
    detalheFaixas,
    subtotal,
    minimoMensal,
    total,
  };
}
