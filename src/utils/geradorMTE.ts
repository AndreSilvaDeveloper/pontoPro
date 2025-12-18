import { format } from 'date-fns';

// Função auxiliar para completar com zeros ou espaços (Padrão MTE)
const txt = (valor: string | number, tamanho: number, tipo: 'num' | 'texto' = 'texto') => {
    const str = String(valor || '').substring(0, tamanho);
    if (tipo === 'num') return str.padStart(tamanho, '0');
    return str.padEnd(tamanho, ' ');
};

// 1. GERAR AFD (Arquivo Fonte de Dados - O "Original")
export const gerarAFD = (pontos: any[], empresa: any) => {
    let linhas = [];
    let nsr = 1; // Número Sequencial de Registro

    // CABEÇALHO (Registro tipo 1)
    // 1(000000001)2(1 - PJ)3(CNPJ)4(CEI)5(Razão Social)6(CRC)
    linhas.push(`0000000011${txt(empresa.cnpj?.replace(/\D/g, ''), 14, 'num')}${txt('', 12, 'num')}${txt(empresa.nome, 150)}00000`);

    // DADOS DOS PONTOS (Registro tipo 3 - Marcação de Ponto)
    // 1(NSR)2(3)3(Data)4(Hora)5(PIS)6(CRC)
    const pontosOrdenados = [...pontos].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    pontosOrdenados.forEach((p) => {
        nsr++;
        if (p.tipo === 'PONTO' || p.subTipo === 'ENTRADA' || p.subTipo === 'SAIDA') {
            const data = format(new Date(p.dataHora), 'ddMMyyyy');
            const hora = format(new Date(p.dataHora), 'HHmm');
            const pis = p.usuario?.pis || '00000000000'; // É obrigatório ter PIS no cadastro
            
            // Layout: NSR(9) + Tipo(1) + Data(8) + Hora(4) + PIS(12) + CRC(4)
            const linha = `${txt(nsr, 9, 'num')}3${data}${hora}${txt(pis, 12, 'num')}0000`;
            linhas.push(linha);
        }
    });

    // TRAILER (Registro tipo 9)
    // 1(999999999)2(Qtde Registros tipo 2)3(Qtde Tipo 3)4(Tipo 4)5(Tipo 5)6(Tipo 9)
    // Simplificado para apenas pontos
    const qtdTipo3 = pontosOrdenados.length;
    linhas.push(`999999999${txt(0, 9, 'num')}${txt(qtdTipo3, 9, 'num')}${txt(0, 9, 'num')}${txt(0, 9, 'num')}1`);

    return linhas.join('\r\n');
};

// 2. GERAR AFDT (Arquivo Fonte de Dados Tratados - O "Auditado")
// Esse é usado quando há edições manuais (que é o caso do seu sistema Admin)
export const gerarAFDT = (pontos: any[], empresa: any, dataInicio: Date, dataFim: Date) => {
    let linhas = [];
    let nsr = 1;

    // CABEÇALHO
    const dataI = format(dataInicio, 'ddMMyyyy');
    const dataF = format(dataFim, 'ddMMyyyy');
    const emissao = format(new Date(), 'ddMMyyyyHHmm');
    linhas.push(`0000000011${txt(empresa.cnpj?.replace(/\D/g, ''), 14, 'num')}${txt('', 12, 'num')}${txt(empresa.nome, 150)}${dataI}${dataF}${emissao}0000`);

    // DETALHE (Pontos)
    pontos.forEach((p) => {
        nsr++;
        const data = format(new Date(p.dataHora), 'ddMMyyyy');
        const hora = format(new Date(p.dataHora), 'HHmm');
        const pis = p.usuario?.pis || '00000000000';
        const numRelogio = '00000000000000001'; // ID fictício do REP (sistema)
        const motivo = p.descricao || '';
        
        // Tipo de registro 2 no AFDT
        // NSR(9) + 2 + Data(8) + Hora(4) + PIS(12) + NumRelogio(17) + TipoMarcacao(1) + Indice(2) + Motivo(100) + CRC(4)
        // Tipo Marcação: I (Inclusão), D (Desconsiderado), ou O (Original) - Aqui simplificamos como Original 'O' ou Inclusão 'I' se foi editado
        const tipoMarcacao = p.editado ? 'I' : 'O'; 
        
        const linha = `${txt(nsr, 9, 'num')}2${data}${hora}${txt(pis, 12, 'num')}${numRelogio}${tipoMarcacao}01${txt(motivo, 100)}0000`;
        linhas.push(linha);
    });

    // TRAILER
    linhas.push(`999999999${txt(1, 9, 'num')}${txt(0, 9, 'num')}${txt(0, 9, 'num')}0000`); // Simplificado

    return linhas.join('\r\n');
};