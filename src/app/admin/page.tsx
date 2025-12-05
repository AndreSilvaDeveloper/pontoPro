'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, differenceInMinutes } from 'date-fns';
import { MapPin } from 'lucide-react';
import Link from 'next/link';
import BotaoRelatorio from '@/components/BotaoRelatorio';

// Interface dos dados
interface Ponto {
  id: string;
  dataHora: string;
  latitude: number;
  longitude: number;
  endereco?: string;
  fotoUrl?: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    horasDiarias?: number;
  };
}

interface UsuarioResumo {
  id: string;
  nome: string;
}

export default function AdminDashboard() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  
  // Filtros (Iniciam com a data de hoje no formato Texto YYYY-MM-DD)
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      console.log("🔄 Buscando dados...");
      
      const resPontos = await axios.get('/api/admin/pontos-todos');
      console.log("✅ Pontos encontrados:", resPontos.data.length);
      setPontos(resPontos.data);

      const resUsers = await axios.get('/api/admin/funcionarios');
      console.log("✅ Funcionários encontrados:", resUsers.data.length);
      setUsuarios(resUsers.data);
      
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      alert("Erro ao buscar dados. Verifique o console (F12).");
    }
  };

  // === FILTRO CORRIGIDO (Comparação de Texto) ===
  const pontosFiltrados = pontos.filter(p => {
    // 1. Extrai apenas a data YYYY-MM-DD do ponto (ignora hora e fuso)
    const dataPontoTexto = format(new Date(p.dataHora), 'yyyy-MM-dd');
    
    // 2. Compara texto com texto (Infalível)
    const passaData = dataPontoTexto >= dataInicio && dataPontoTexto <= dataFim;
    
    // 3. Compara usuário (se tiver filtro)
    const passaUsuario = filtroUsuario ? p.usuario.id === filtroUsuario : true;

    return passaData && passaUsuario;
  });

  // Cálculo de Horas (Mantido igual)
  const calcularResumo = () => {
    if (!filtroUsuario) return null;

    const sorted = [...pontosFiltrados].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
    let minutosTrabalhados = 0;
    
    for (let i = 0; i < sorted.length; i += 2) {
      const entrada = sorted[i];
      const saida = sorted[i + 1];
      if (saida) {
        minutosTrabalhados += differenceInMinutes(new Date(saida.dataHora), new Date(entrada.dataHora));
      }
    }

    const horasFeitas = Math.floor(minutosTrabalhados / 60);
    const minFeitos = minutosTrabalhados % 60;
    
    const userSelecionado = pontosFiltrados[0]?.usuario || usuarios.find(u => u.id === filtroUsuario);
    // @ts-ignore
    const metaMinutos = userSelecionado?.horasDiarias ? userSelecionado.horasDiarias * 60 : 0;
    
    return {
      total: `${horasFeitas}h ${minFeitos}m`,
      // @ts-ignore
      meta: userSelecionado?.horasDiarias ? `${userSelecionado.horasDiarias}h/dia` : 'Não definida',
      minutosTotal: minutosTrabalhados
    };
  };

  const resumo = calcularResumo();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Painel de Controle</h1>
            <p className="text-slate-400">Monitoramento em Tempo Real</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/funcionarios" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">
              Equipe
            </Link>
             <Link href="/admin/perfil" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">
              Minha Conta
            </Link>
             <Link href="/" className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm">
              Voltar
            </Link>
          </div>
        </div>

        {/* ÁREA DE FILTROS */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
          
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-500 mb-1 block">Funcionário</label>
            <select 
              value={filtroUsuario} 
              onChange={e => setFiltroUsuario(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white"
            >
              <option value="">Todos os Funcionários</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="text-xs text-slate-500 mb-1 block">Data Início</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)}
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white"
            />
          </div>

          <div className="w-full md:w-auto">
            <label className="text-xs text-slate-500 mb-1 block">Data Fim</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)}
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white"
            />
          </div>

          {/* Botão de Relatório (Visualizar + Baixar) */}
          <BotaoRelatorio 
            pontos={pontosFiltrados} 
            filtro={{ 
              inicio: dataInicio, 
              fim: dataFim, 
              usuario: filtroUsuario ? usuarios.find(u=>u.id === filtroUsuario)?.nome : 'Todos' 
            }} 
            resumoHoras={resumo}
          />

        </div>

        {/* CARD DE RESUMO */}
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 p-6 rounded-xl border border-blue-900/50">
              <h3 className="text-blue-400 text-sm font-bold">Total Trabalhado</h3>
              <p className="text-3xl font-bold text-white">{resumo.total}</p>
            </div>
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-slate-400 text-sm">Meta Definida</h3>
              <p className="text-xl font-bold text-white">{resumo.meta}</p>
            </div>
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h3 className="text-slate-400 text-sm">Batidas de Ponto</h3>
              <p className="text-xl font-bold text-white">{pontosFiltrados.length}</p>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4">Funcionário</th>
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Local</th>
                  <th className="p-4">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pontosFiltrados.length > 0 ? pontosFiltrados.map((ponto) => (
                  <tr key={ponto.id} className="hover:bg-slate-800/50">
                    <td className="p-4 font-medium">{ponto.usuario.nome}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">{format(new Date(ponto.dataHora), 'HH:mm:ss')}</span>
                        <span className="text-xs text-slate-500">{format(new Date(ponto.dataHora), 'dd/MM/yyyy')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={ponto.endereco}>
                      {ponto.endereco || `${ponto.latitude.toFixed(4)}, ${ponto.longitude.toFixed(4)}`}
                    </td>
                    <td className="p-4">
                      {ponto.fotoUrl ? (
                        <a href={ponto.fotoUrl} target="_blank" className="text-blue-400 text-xs hover:underline border border-blue-900/50 px-2 py-1 rounded">
                          Ver Foto
                        </a>
                      ) : <span className="text-xs text-slate-600">--</span>}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Nenhum ponto encontrado neste período. <br/>
                      <span className="text-xs opacity-50">(Verifique se as datas estão corretas)</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}