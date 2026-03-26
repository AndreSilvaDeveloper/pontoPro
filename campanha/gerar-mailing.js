/**
 * Script para gerar mailing a partir dos dados públicos da Receita Federal
 * Fonte: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj
 *
 * Os dados são públicos e abertos (Lei de Acesso à Informação).
 *
 * Uso: node campanha/gerar-mailing.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createUnzip } = require('zlib');
const readline = require('readline');

const CAMPANHA_DIR = path.join(__dirname);
const TEMP_DIR = path.join(CAMPANHA_DIR, 'temp');
const OUTPUT_FILE = path.join(CAMPANHA_DIR, 'mailing-workid.csv');

// CNAEs que mais precisam de ponto (com 10+ funcionários tipicamente)
const CNAES_ALVO = new Set([
  '5611201', // Restaurantes
  '5611202', // Bares
  '5611203', // Lanchonetes
  '5620101', // Fornecimento de alimentos
  '5620104', // Fornecimento de alimentos para empresas
  '4711301', // Supermercados
  '4711302', // Mercados
  '4712100', // Minimercados (maiores)
  '4721102', // Padaria
  '4781400', // Vestuário
  '4771701', // Farmácias
  '4771702', // Farmácias homeopáticas
  '4744005', // Mat. construção
  '4744001', // Mat. construção em geral
  '4753900', // Tapetes e cortinas
  '8630501', // Clínicas médicas
  '8630502', // Clínicas médicas
  '8630503', // Consultas médicas
  '8630504', // Clínicas odontológicas
  '8650001', // Atividades de enfermagem
  '8650002', // Atividades de fisioterapia
  '8011101', // Vigilância
  '8012900', // Transporte de valores
  '4520001', // Mecânica automotiva
  '4520002', // Elétrica automotiva
  '4520005', // Lavagem
  '4930202', // Transporte rodoviário
  '4930201', // Transporte rodoviário
  '5510801', // Hotéis
  '5510802', // Apart-hotéis
  '5590601', // Albergues
  '5590602', // Campings
  '5590603', // Pensões
  '8591100', // Ensino esportes
  '8511200', // Educação infantil
  '8512100', // Ensino fundamental
  '8520100', // Ensino médio
  '4741500', // Tintas
  '4742300', // Material elétrico
  '4743100', // Vidros
  '4744002', // Madeira
  '4744003', // Ferragens
  '4744004', // Cimento
  '4321500', // Instalação elétrica
  '4322301', // Instalação hidráulica
  '4120400', // Construção de edifícios
  '4399101', // Construção civil
  '9311500', // Academias
  '9312300', // Clubes sociais
  '4923001', // Transporte de passageiros
  '4922101', // Transporte de passageiros
  '1011201', // Frigorífico - abate de bovinos
  '1012101', // Frigorífico - abate de suínos
  '1013901', // Frigorífico - abate de aves
  '1091100', // Panificação industrial
  '1099601', // Fabricação de alimentos
  '2511000', // Estruturas metálicas
  '2512800', // Esquadrias de metal
  '2599301', // Serviços de usinagem
  '2542000', // Fabricação de artigos de serralheria
]);

// Estados alvo
const ESTADOS_ALVO = new Set(['MG', 'SP', 'RJ', 'PR', 'SC', 'RS', 'BA', 'GO', 'ES', 'PE']);

// Portes que interessam (não MEI, não microempresa individual)
const PORTES_ALVO = new Set(['03', '05']); // 03=Empresa de Pequeno Porte, 05=Demais

async function baixarArquivo(url, destino) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destino);
    const get = url.startsWith('https') ? https.get : http.get;

    get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destino);
        return baixarArquivo(response.headers.location, destino).then(resolve).catch(reject);
      }

      const total = parseInt(response.headers['content-length'] || '0');
      let baixado = 0;

      response.on('data', (chunk) => {
        baixado += chunk.length;
        if (total > 0) {
          const pct = ((baixado / total) * 100).toFixed(1);
          process.stdout.write(`\r  Baixando: ${pct}% (${(baixado/1024/1024).toFixed(1)}MB)`);
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(' OK');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destino, () => {});
      reject(err);
    });
  });
}

async function processarCSV(arquivo, processarLinha) {
  const rl = readline.createInterface({
    input: fs.createReadStream(arquivo, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of rl) {
    count++;
    processarLinha(line, count);
  }
  return count;
}

// Alternativa: usar API pública do Brasil API
async function buscarPorAPI() {
  console.log('=== Gerando Mailing via API Pública ===\n');

  const resultados = [];
  const cnaes = Array.from(CNAES_ALVO);

  // Usar a API da ReceitaWS (gratuita, 3 consultas/min)
  // Ou BrasilAPI que é mais aberta

  // Vamos usar abordagem com Casa dos Dados API
  const buscar = (pagina, cnae) => {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        query: {
          termo: [],
          atividade_principal: [cnae],
          natureza_juridica: [],
          uf: ['MG', 'SP', 'RJ'],
          municipio: [],
          bairro: [],
          situacao_cadastral: 'ATIVA',
          cep: [],
          ddd: [],
        },
        range_query: {
          data_abertura: { lte: null, gte: null },
          capital_social: { lte: null, gte: 50000 },
        },
        extras: {
          somente_mei: false,
          excluir_mei: true,
          com_email: false,
          incluir_atividade_secundaria: false,
          com_contato_telefonico: true,
          somente_fixo: false,
          somente_celular: true,
          somente_matriz: true,
          somente_filial: false,
        },
        page: pagina,
      });

      const options = {
        hostname: 'api.casadosdados.com.br',
        path: '/v2/public/cnpj/search',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Mozilla/5.0',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ data: { cnpj: [] } });
          }
        });
      });

      req.on('error', () => resolve({ data: { cnpj: [] } }));
      req.write(body);
      req.end();
    });
  };

  // Buscar por CNAEs principais (os que mais convertem)
  const cnaesTop = [
    '5611201', // Restaurantes
    '4711301', // Supermercados
    '4771701', // Farmácias
    '8630503', // Clínicas
    '4781400', // Vestuário
    '4744005', // Mat. construção
    '4120400', // Construção
    '9311500', // Academias
    '5510801', // Hotéis
    '4721102', // Padarias
    '8011101', // Vigilância
    '4520001', // Mecânica
    '4930202', // Transporte
    '8512100', // Ensino fundamental
    '1011201', // Frigoríficos
  ];

  console.log(`Buscando empresas em ${cnaesTop.length} segmentos...\n`);

  for (const cnae of cnaesTop) {
    process.stdout.write(`  CNAE ${cnae}...`);

    try {
      const res = await buscar(1, cnae);
      const empresas = res?.data?.cnpj || [];

      for (const emp of empresas) {
        // Filtrar: precisa ter telefone celular
        const telefones = (emp.telefone1 || '') + ';' + (emp.telefone2 || '');
        const celular = extrairCelular(telefones, emp.ddd1 || emp.ddd2 || '');

        if (celular) {
          resultados.push({
            nome: (emp.razao_social || '').substring(0, 60),
            telefone: celular,
            cidade: emp.municipio || '',
            estado: emp.uf || '',
            cnae: cnae,
          });
        }
      }

      console.log(` ${empresas.length} encontradas (${resultados.length} com celular)`);
    } catch (err) {
      console.log(` erro`);
    }

    // Respeitar rate limit
    await sleep(1500);
  }

  return resultados;
}

function extrairCelular(telefones, ddd) {
  // Procurar números de celular (9 dígitos começando com 9)
  const nums = telefones.replace(/[^\d;]/g, '').split(';').filter(Boolean);

  for (const num of nums) {
    const limpo = num.replace(/\D/g, '');

    // Número completo com DDD (11 dígitos: 2 DDD + 9 número)
    if (limpo.length === 11 && limpo[2] === '9') {
      return '55' + limpo;
    }

    // Número completo com 55 (13 dígitos)
    if (limpo.length === 13 && limpo.startsWith('55') && limpo[4] === '9') {
      return limpo;
    }

    // Número sem DDD (9 dígitos começando com 9)
    if (limpo.length === 9 && limpo[0] === '9' && ddd) {
      return '55' + ddd + limpo;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   GERADOR DE MAILING - WORKID        ║');
  console.log('╚══════════════════════════════════════╝\n');

  const resultados = await buscarPorAPI();

  if (resultados.length === 0) {
    console.log('\nNenhum resultado encontrado. A API pode estar limitada.');
    console.log('Tente novamente mais tarde ou use o Casa dos Dados manualmente.');
    return;
  }

  // Remover duplicatas por telefone
  const unicos = {};
  for (const r of resultados) {
    if (!unicos[r.telefone]) {
      unicos[r.telefone] = r;
    }
  }

  const lista = Object.values(unicos);

  // Gerar CSV
  const header = 'nome_empresa,telefone,cidade,estado';
  const linhas = lista.map(r =>
    `"${r.nome.replace(/"/g, '')}","${r.telefone}","${r.cidade}","${r.estado}"`
  );

  const csv = [header, ...linhas].join('\n');
  fs.writeFileSync(OUTPUT_FILE, csv, 'utf-8');

  console.log(`\n✅ Mailing gerado: ${OUTPUT_FILE}`);
  console.log(`   Total de contatos: ${lista.length}`);
  console.log(`   Formato: CSV (nome, telefone, cidade, estado)`);
  console.log(`   Telefones: celular com DDD (formato 55XXXXXXXXXXX)`);
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
