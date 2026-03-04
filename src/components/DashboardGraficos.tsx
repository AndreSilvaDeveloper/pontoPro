'use client';

import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { format, subDays, isSameDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']; // Vermelho, Amarelo, Azul, Verde

export default function DashboardGraficos({ registros }: { registros: any[] }) {

  // 1. DADOS PARA O GRÁFICO DE BARRAS (Últimos 7 dias)
  const dadosBarras = useMemo(() => {
    const hoje = new Date();
    const ultimos7Dias = Array.from({ length: 7 }, (_, i) => subDays(hoje, 6 - i));

    return ultimos7Dias.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const label = format(dia, 'dd/MM');

      // Filtra registros deste dia
      const regsDoDia = registros.filter((r: any) => 
        format(new Date(r.dataHora), 'yyyy-MM-dd') === diaStr
      );

      // Conta Ausências
      const ausencias = regsDoDia.filter((r: any) => r.tipo === 'AUSENCIA').length;

      // Calcula Horas Trabalhadas (Simplificado para o gráfico: soma pares)
      let minutosTrabalhados = 0;
      const pontos = regsDoDia.filter((r: any) => r.tipo === 'PONTO').sort((a:any, b:any) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());
      
      for (let i = 0; i < pontos.length; i += 2) {
        if (pontos[i+1]) {
           const ent = new Date(pontos[i].dataHora);
           const sai = new Date(pontos[i+1].dataHora);
           minutosTrabalhados += differenceInMinutes(sai, ent);
        }
      }
      
      return {
        name: label,
        horas: Number((minutosTrabalhados / 60).toFixed(1)), // Converte para horas float (ex: 8.5)
        ausencias: ausencias
      };
    });
  }, [registros]);

  // 2. DADOS PARA O GRÁFICO DE PIZZA (Tipos de Ausência)
  const dadosPizza = useMemo(() => {
    const ausencias = registros.filter((r: any) => r.tipo === 'AUSENCIA');
    
    const contagem: Record<string, number> = {};
    ausencias.forEach((a: any) => {
        const tipo = a.subTipo || 'OUTROS'; // ATESTADO, FERIAS, ETC
        contagem[tipo] = (contagem[tipo] || 0) + 1;
    });

    return Object.keys(contagem).map((key) => ({
        name: key.replace('_', ' '),
        value: contagem[key]
    }));
  }, [registros]);

  if (registros.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      
      {/* GRÁFICO 1: BARRAS (Ocupa 2 colunas) */}
      <div className="bg-surface-solid p-4 rounded-xl border border-border-input col-span-1 md:col-span-2 shadow-lg">
        <h3 className="text-text-muted text-xs font-bold uppercase mb-4 tracking-wider">Produtividade (Últimos 7 dias)</h3>
        <div className="h-[250px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosBarras}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} unit="h"/>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: '#334155', opacity: 0.4 }}
              />
              <Bar dataKey="horas" name="Horas Trabalhadas" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: PIZZA (Ocupa 1 coluna) */}
      <div className="bg-surface-solid p-4 rounded-xl border border-border-input shadow-lg flex flex-col">
        <h3 className="text-text-muted text-xs font-bold uppercase mb-4 tracking-wider">Motivos de Ausência</h3>
        <div className="h-[250px] w-full text-xs flex-1">
            {dadosPizza.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={dadosPizza}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-faint">
                    <p>Sem ausências no período.</p>
                    <p className="text-[10px] mt-1">Equipe 100% presente! 🚀</p>
                </div>
            )}
        </div>
      </div>

    </div>
  );
}