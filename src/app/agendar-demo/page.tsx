'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, User, Phone, Send, CheckCircle2, MessageCircle } from 'lucide-react';
import { LINKS } from '@/config/links';

const HORARIOS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

function getProximosDias(qtd: number) {
  const dias = [];
  const hoje = new Date();
  let d = new Date(hoje);
  d.setDate(d.getDate() + 1); // começa amanhã

  while (dias.length < qtd) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) { // seg-sex
      dias.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function formatDiaSemana(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function formatDiaMes(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDataCompleta(d: Date) {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function AgendarDemo() {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [horario, setHorario] = useState('');
  const [enviado, setEnviado] = useState(false);

  const dias = getProximosDias(10);

  const enviar = () => {
    if (!nome.trim() || !whatsapp.trim() || !dataSelecionada || !horario) return;

    const dataFormatada = formatDataCompleta(dataSelecionada);
    const msg = [
      `*Agendamento de Demonstração - WorkID*`,
      ``,
      `*Nome:* ${nome.trim()}`,
      `*WhatsApp:* ${whatsapp.trim()}`,
      empresa.trim() ? `*Empresa:* ${empresa.trim()}` : '',
      `*Data:* ${dataFormatada}`,
      `*Horário:* ${horario}`,
      ``,
      `_Enviado pelo formulário do site_`,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${LINKS.whatsapp.number}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mx-auto">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>

          <h1 className="text-3xl font-extrabold text-white">Agendamento enviado!</h1>

          <p className="text-gray-400 text-lg">
            Sua demonstração foi solicitada para <strong className="text-white">{formatDataCompleta(dataSelecionada!)}</strong> às <strong className="text-white">{horario}</strong>.
          </p>

          <p className="text-gray-500 text-sm">
            Vamos confirmar pelo WhatsApp em breve. Fique de olho nas mensagens!
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <Link
              href="/signup"
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all text-center"
            >
              Criar minha conta gratis
            </Link>
            <Link
              href="/"
              className="w-full py-3 border border-purple-500/30 hover:bg-purple-950/30 text-white rounded-xl font-bold text-sm transition-all text-center"
            >
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const podEnviar = nome.trim() && whatsapp.trim() && dataSelecionada && horario;

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-500/10 bg-[#0a0e27]/80 backdrop-blur-xl">
        <nav className="container mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src="/logo.png" alt="WorkID" width={40} height={40} className="rounded-xl" />
            <span className="text-xl font-extrabold text-white">WorkID</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
        </nav>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16 max-w-2xl">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 mb-4">
            <MessageCircle size={14} className="text-purple-300" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Gratuito e sem compromisso</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Agende sua{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              demonstração
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">
            Veja o WorkID funcionando ao vivo. Em 20 minutos mostramos como o sistema resolve o controle de ponto da sua empresa.
          </p>
        </div>

        <div className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <User size={14} className="text-purple-400" /> Seu nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Como podemos te chamar?"
              className="w-full bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 focus:border-purple-500 rounded-xl p-4 text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Phone size={14} className="text-purple-400" /> WhatsApp
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="(32) 99999-9999"
              className="w-full bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 focus:border-purple-500 rounded-xl p-4 text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          {/* Empresa (opcional) */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
              Nome da empresa <span className="text-gray-600 font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Ex: Padaria do João"
              className="w-full bg-purple-950/20 border border-purple-500/20 hover:border-purple-500/40 focus:border-purple-500 rounded-xl p-4 text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>

          {/* Escolher data */}
          <div className="space-y-3">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-purple-400" /> Escolha o dia
            </label>
            <div className="grid grid-cols-5 gap-2">
              {dias.map((d, i) => {
                const selecionado = dataSelecionada?.toDateString() === d.toDateString();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDataSelecionada(d)}
                    className={`py-3 px-2 rounded-xl border text-center transition-all min-h-[60px] ${
                      selecionado
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-purple-950/20 border-purple-500/20 text-gray-400 hover:border-purple-500/40 hover:text-white'
                    }`}
                  >
                    <p className="text-[10px] uppercase font-bold">{formatDiaSemana(d)}</p>
                    <p className="text-sm font-bold mt-0.5">{formatDiaMes(d)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escolher horário */}
          {dataSelecionada && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-purple-400" /> Escolha o horário
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {HORARIOS.map(h => {
                  const selecionado = horario === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHorario(h)}
                      className={`py-3 rounded-xl border font-bold text-sm transition-all min-h-[44px] ${
                        selecionado
                          ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-purple-950/20 border-purple-500/20 text-gray-400 hover:border-purple-500/40 hover:text-white'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumo + Enviar */}
          {podEnviar && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Resumo</p>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-300"><strong className="text-white">{nome}</strong> · {whatsapp}</p>
                  <p className="text-gray-300">
                    <strong className="text-white">{formatDataCompleta(dataSelecionada!)}</strong> às <strong className="text-white">{horario}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={enviar}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
              >
                <Send size={18} /> Confirmar pelo WhatsApp
              </button>

              <p className="text-center text-xs text-gray-600">
                Ao clicar, voce sera redirecionado para o WhatsApp para confirmar o agendamento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
