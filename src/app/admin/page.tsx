"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  format,
  differenceInMinutes,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isSameDay,
  isAfter,
  getDay,
} from "date-fns";
import {
  LogOut,
  MapPin,
  User,
  Calendar,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import BotaoRelatorio from "@/components/BotaoRelatorio";

// Função para corrigir fuso horário na visualização
const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
};

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
    jornada?: any;
  };
}

interface UsuarioResumo {
  id: string;
  nome: string;
}

export default function AdminDashboard() {
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);

  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [dataInicio, setDataInicio] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const resPontos = await axios.get("/api/admin/pontos-todos");
      setPontos(resPontos.data);
      const resUsers = await axios.get("/api/admin/funcionarios");
      setUsuarios(resUsers.data);
    } catch (error) {
      console.error("Erro ao carregar", error);
    }
  };

  const pontosFiltrados = pontos.filter((p) => {
    const dataPontoTexto = format(new Date(p.dataHora), "yyyy-MM-dd");
    const passaData = dataPontoTexto >= dataInicio && dataPontoTexto <= dataFim;
    const passaUsuario = filtroUsuario ? p.usuario.id === filtroUsuario : true;
    return passaData && passaUsuario;
  });

  const calcularEstatisticas = () => {
    if (!filtroUsuario) return null;

    const agora = new Date();
    const pontosDoUsuario = pontos.filter(
      (p) => p.usuario.id === filtroUsuario
    );
    // Pega jornada do primeiro ponto ou da lista de usuários
    const dadosUsuario =
      pontosDoUsuario[0]?.usuario ||
      usuarios.find((u) => u.id === filtroUsuario);
    // @ts-ignore
    const jornadaConfig = dadosUsuario?.jornada || {};

    pontosDoUsuario.sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );

    let minutosHoje = 0;
    let minutosSemana = 0;
    let minutosMes = 0;
    let minutosAno = 0;
    let statusAtual = "Ausente";
    let tempoDecorridoAgora = 0;

    // Meta do dia
    const diasMap = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const diaSemanaHoje = diasMap[getDay(agora)];
    const configHoje = jornadaConfig[diaSemanaHoje];

    let metaHojeMinutos = 0;
    if (configHoje && configHoje.ativo) {
      const calcDiff = (inicio: string, fim: string) => {
        if (!inicio || !fim) return 0;
        const [h1, m1] = inicio.split(":").map(Number);
        const [h2, m2] = fim.split(":").map(Number);
        return h2 * 60 + m2 - (h1 * 60 + m1);
      };
      metaHojeMinutos += calcDiff(configHoje.e1, configHoje.s1);
      metaHojeMinutos += calcDiff(configHoje.e2, configHoje.s2);
    }

    const pontosPorDia: Record<string, typeof pontosDoUsuario> = {};
    pontosDoUsuario.forEach((p) => {
      const dia = format(new Date(p.dataHora), "yyyy-MM-dd");
      if (!pontosPorDia[dia]) pontosPorDia[dia] = [];
      pontosPorDia[dia].push(p);
    });

    Object.keys(pontosPorDia).forEach((dia) => {
      const batidas = pontosPorDia[dia];
      let minutosNoDia = 0;
      for (let i = 0; i < batidas.length; i += 2) {
        const entrada = new Date(batidas[i].dataHora);
        const saida = batidas[i + 1] ? new Date(batidas[i + 1].dataHora) : null;
        if (saida) minutosNoDia += differenceInMinutes(saida, entrada);
        else if (isSameDay(entrada, agora)) {
          const trab = differenceInMinutes(agora, entrada);
          minutosNoDia += trab;
          statusAtual = "Trabalhando";
          tempoDecorridoAgora = trab;
        }
      }
      const dataObj = criarDataLocal(dia);
      if (isSameDay(dataObj, agora)) minutosHoje += minutosNoDia;
      if (isAfter(dataObj, startOfWeek(agora))) minutosSemana += minutosNoDia;
      if (isAfter(dataObj, startOfMonth(agora))) minutosMes += minutosNoDia;
      if (isAfter(dataObj, startOfYear(agora))) minutosAno += minutosNoDia;
    });

    const formatarHoras = (min: number) =>
      `${Math.floor(min / 60)}h ${min % 60}m`;
    const formatarMeta = (min: number) =>
      `${Math.floor(min / 60)}h ${min % 60}m`;

    return {
      status: statusAtual,
      tempoAgora:
        statusAtual === "Trabalhando"
          ? formatarHoras(tempoDecorridoAgora)
          : "--",
      hoje: formatarHoras(minutosHoje),
      metaHoje: formatarMeta(metaHojeMinutos),
      semana: formatarHoras(minutosSemana),
      mes: formatarHoras(minutosMes),
      ano: formatarHoras(minutosAno),
    };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-purple-400">
              WorkID Admin
            </h1>
            <p className="text-slate-400 text-sm">Visão Geral da Empresa</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/admin/solicitacoes" className="px-4 py-2 bg-purple-900/50 text-purple-300 border border-purple-800 rounded-lg hover:bg-purple-900 transition text-sm flex items-center gap-2">
              <AlertCircle size={16} /> Ajustes
            </Link>
           
            <Link
              href="/admin/funcionarios"
              className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700"
            >
              Equipe
            </Link>
            <Link
              href="/admin/perfil"
              className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-sm border border-slate-700"
            >
              Minha Conta
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-4 py-2 bg-red-900/20 text-red-300 rounded-lg hover:bg-red-900/40 transition text-sm flex items-center gap-2 border border-red-900/30"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        {/* Filtros (Responsivo) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1">
            <label className="text-xs text-slate-500 mb-1 block">
              Funcionário
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"
            >
              <option value="">Todos os Funcionários</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <div className="w-full md:w-auto">
            <BotaoRelatorio
              pontos={pontosFiltrados}
              filtro={{
                inicio: criarDataLocal(dataInicio),
                fim: criarDataLocal(dataFim),
                usuario: filtroUsuario
                  ? usuarios.find((u) => u.id === filtroUsuario)?.nome
                  : "Todos",
              }}
              resumoHoras={stats}
            />
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div
              className={`p-4 rounded-xl border ${
                stats.status === "Trabalhando"
                  ? "bg-green-900/20 border-green-800"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Status
              </h3>
              <p
                className={`text-lg font-bold ${
                  stats.status === "Trabalhando"
                    ? "text-green-400"
                    : "text-slate-500"
                }`}
              >
                {stats.status}
              </p>
              {stats.status === "Trabalhando" && (
                <p className="text-xs text-green-300 mt-1">
                  ⏱ {stats.tempoAgora}
                </p>
              )}
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Hoje
              </h3>
              <p className="text-lg font-bold text-white">{stats.hoje}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Semana
              </h3>
              <p className="text-lg font-bold text-white">{stats.semana}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Mês
              </h3>
              <p className="text-lg font-bold text-white">{stats.mes}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <h3 className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Ano
              </h3>
              <p className="text-lg font-bold text-white">{stats.ano}</p>
            </div>
          </div>
        )}

        {/* LISTA RESPONSIVA (Tabela no PC / Cards no Mobile) 🚀 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          {/* Cabeçalho (Só aparece no Desktop) */}
          <div className="hidden md:grid grid-cols-5 bg-slate-950 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <div>Funcionário</div>
            <div>Data</div>
            <div>Hora</div>
            <div className="col-span-1">Localização</div>
            <div className="text-right">Foto</div>
          </div>

          <div className="divide-y divide-slate-800">
            {pontosFiltrados.length > 0 ? (
              pontosFiltrados.map((ponto) => (
                <div
                  key={ponto.id}
                  className="p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-3 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Funcionário */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-200 shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm md:text-base">
                        {ponto.usuario.nome}
                      </p>
                      <p className="text-xs text-slate-500 md:hidden">
                        {ponto.usuario.email}
                      </p>
                    </div>
                  </div>

                  {/* Data (Mobile: alinhado com ícone) */}
                  <div className="flex items-center gap-2 md:block text-slate-300">
                    <Calendar size={14} className="md:hidden text-slate-500" />
                    <span className="text-sm">
                      {format(new Date(ponto.dataHora), "dd/MM/yyyy")}
                    </span>
                  </div>

                  {/* Hora (Mobile: destaque verde) */}
                  <div className="flex items-center gap-2 md:block">
                    <Clock size={14} className="md:hidden text-green-500" />
                    <span className="text-sm font-bold text-green-400">
                      {format(new Date(ponto.dataHora), "HH:mm")}
                    </span>
                  </div>

                  {/* Localização */}
                  <div className="flex items-start gap-2 md:block col-span-1">
                    <MapPin
                      size={14}
                      className="md:hidden text-purple-500 mt-0.5"
                    />
                    <span
                      className="text-xs text-slate-400 block break-words"
                      title={ponto.endereco}
                    >
                      {ponto.endereco
                        ? ponto.endereco.length > 40
                          ? ponto.endereco.substring(0, 40) + "..."
                          : ponto.endereco
                        : `${ponto.latitude.toFixed(
                            4
                          )}, ${ponto.longitude.toFixed(4)}`}
                    </span>
                  </div>

                  {/* Foto (Mobile: botão largo / Desktop: link discreto) */}
                  <div className="md:text-right mt-2 md:mt-0">
                    {ponto.fotoUrl ? (
                      <a
                        href={ponto.fotoUrl}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-600/30 rounded text-xs font-bold hover:bg-purple-600 hover:text-white w-full md:w-auto transition-all"
                      >
                        <ExternalLink size={12} /> Ver Foto
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600 italic">
                        Sem foto
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <p>Nenhum registro encontrado.</p>
                <p className="text-xs mt-1 opacity-50">
                  Tente mudar as datas ou o funcionário.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
