"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  format,
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
  isSameDay,
} from "date-fns";
import { ArrowLeft, History, Calendar, Search, Clock } from "lucide-react";
import Link from "next/link";
import BotaoRelatorio from "@/components/BotaoRelatorio";

export default function MeuHistorico() {
  const [pontos, setPontos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<any>(null);

  const [dataInicio, setDataInicio] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dataFim, setDataFim] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // === CÁLCULO DE HORAS (Igual ao do Admin) ===
  const calcularHoras = (listaPontos: any[]) => {
    // Ordena do mais antigo pro mais novo para calcular pares
    const sorted = [...listaPontos].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );

    let minutosTotal = 0;

    // Agrupa por dia
    const pontosPorDia: Record<string, any[]> = {};
    sorted.forEach((p) => {
      const dia = format(new Date(p.dataHora), "yyyy-MM-dd");
      if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
      pontosPorDia[dia].push(p);
    });

    Object.keys(pontosPorDia).forEach((dia) => {
      const batidas = pontosPorDia[dia];
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        const saida = batidas[i + 1] ? new Date(batidas[i + 1].dataHora) : null;

        if (saida) {
          minutosTotal += differenceInMinutes(saida, entrada);
        } else if (isSameDay(entrada, new Date())) {
          // Se é hoje e não tem saída, conta até agora (opcional)
          minutosTotal += differenceInMinutes(new Date(), entrada);
        }
      }
    });

    const horas = Math.floor(minutosTotal / 60);
    const min = minutosTotal % 60;

    return {
      total: `${horas}h ${min}m`,
      minutos: minutosTotal,
    };
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/funcionario/historico?inicio=${dataInicio}&fim=${dataFim}`
      );
      setPontos(res.data);
      setResumo(calcularHoras(res.data)); // Calcula ao carregar
    } catch (error) {
      console.error("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtroPDF = {
    inicio: dataInicio,
    fim: dataFim,
    usuario: pontos[0]?.usuario.nome || "Eu",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <History className="text-purple-400" />
            <h1 className="text-xl font-bold">Meus Registros</h1>
          </div>
          <Link
            href="/"
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
          >
            <ArrowLeft size={20} />
          </Link>
        </div>

        {/* CARD DE RESUMO DE HORAS */}
        {resumo && (
          <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-lg text-white">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs text-purple-300 uppercase font-bold">
                  Total no Período
                </p>
                <p className="text-2xl font-bold text-white">{resumo.total}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Filtrar Período
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">
                De:
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1">
                Até:
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={carregar}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
              <Search size={16} /> Filtrar
            </button>
            {/* Passamos o resumoHoras para o PDF aqui 👇 */}
            {pontos.length > 0 && (
              <div className="flex-1">
                <BotaoRelatorio
                  pontos={pontos}
                  filtro={filtroPDF}
                  resumoHoras={resumo}
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-500">Carregando...</p>
          ) : pontos.length === 0 ? (
            <p className="text-center text-slate-500">Nada encontrado.</p>
          ) : (
            pontos.map((ponto) => (
              <div
                key={ponto.id}
                className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center relative overflow-hidden"
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    ponto.tipo === "ENTRADA"
                      ? "bg-green-500"
                      : ponto.tipo === "SAIDA"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }`}
                />
                <div className="pl-3">
                  <p className="font-bold text-lg text-white">
                    {format(new Date(ponto.dataHora), "HH:mm")}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar size={10} />
                    {format(new Date(ponto.dataHora), "dd/MM/yyyy")}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">
                    {ponto.tipo?.replace("_", " ") || "PONTO"}
                  </span>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-400 max-w-[150px] truncate block text-right">
                      {ponto.endereco ? ponto.endereco.split(",")[0] : "GPS"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
