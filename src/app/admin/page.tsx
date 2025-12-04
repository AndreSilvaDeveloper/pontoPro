import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, Clock, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Esta função diz ao Next.js para não guardar cache desta página (dados sempre frescos)
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // 1. Buscar os pontos no banco de dados (os mais recentes primeiro)
  const pontos = await prisma.ponto.findMany({
    include: {
      usuario: true, // Traz os dados do funcionário junto
    },
    orderBy: {
      dataHora: 'desc',
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Painel do Gestor</h1>
            <p className="text-slate-400">Monitoramento de Ponto em Tempo Real</p>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Voltar para o App
          </Link>
        </div>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-slate-400 text-sm">Total de Registros</h3>
            <p className="text-3xl font-bold text-white">{pontos.length}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-slate-400 text-sm">Último Registro</h3>
            <p className="text-xl font-bold text-green-400">
              {pontos.length > 0 
                ? format(pontos[0].dataHora, "HH:mm '•' dd/MM", { locale: ptBR }) 
                : '--'}
            </p>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                  <th className="p-4 font-semibold">Funcionário</th>
                  <th className="p-4 font-semibold">Data / Hora</th>
                  <th className="p-4 font-semibold">Foto (Segurança)</th>
                  <th className="p-4 font-semibold">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pontos.map((ponto) => (
                  <tr key={ponto.id} className="hover:bg-slate-800/50 transition-colors">
                    
                    {/* Coluna Funcionário */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-200">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{ponto.usuario.nome}</p>
                          <p className="text-xs text-slate-500">{ponto.usuario.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Coluna Data e Hora */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar size={14} className="text-blue-500" />
                          <span>{format(ponto.dataHora, "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                          <Clock size={16} className="text-green-500" />
                          <span>{format(ponto.dataHora, "HH:mm:ss")}</span>
                        </div>
                      </div>
                    </td>

                    {/* Coluna Foto */}
                    <td className="p-4">
                      {ponto.fotoUrl && ponto.fotoUrl.length > 50 ? (
                        <div className="relative group w-16 h-16">
                           {/* Exibe a foto pequena, mas mostra grande se passar o mouse (hover) */}
                          <img 
                            src={ponto.fotoUrl} 
                            alt="Registro" 
                            className="w-16 h-16 rounded-lg object-cover border border-slate-600 group-hover:scale-[3] group-hover:z-50 transition-transform origin-left absolute top-0 left-0 bg-black"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">Sem foto</span>
                      )}
                    </td>

                    {/* Coluna Mapa */}
                    <td className="p-4">
                      <a 
                        href={`https://www.google.com/maps?q=${ponto.latitude},${ponto.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-sm font-medium border border-blue-600/20 hover:border-blue-500"
                      >
                        <MapPin size={16} />
                        Ver no Mapa
                      </a>
                    </td>

                  </tr>
                ))}
                
                {pontos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      Nenhum ponto registrado ainda.
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