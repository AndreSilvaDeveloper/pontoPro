'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, User, Phone, Send, CheckCircle2, MessageCircle, Loader2 } from 'lucide-react';
import { LINKS } from '@/config/links';
import { trackEvent, trackLead } from '@/lib/analytics';
import { mascaraTelefone, telefoneValido } from '@/utils/mascaraTelefone';

function getProximosDias(qtd: number, diasAtivos: Set<number>, feriados: Set<string>) {
  // Se a config não foi carregada ainda, devolve vazio (a UI fica em "carregando").
  if (diasAtivos.size === 0) return [];
  const dias: Date[] = [];
  const hoje = new Date();
  // Começa hoje — se ainda houver slot respeitando antecedencia_min_min, o lead consegue agendar pro mesmo dia.
  const d = new Date(hoje);

  // Limite defensivo para não loopar caso só haja um dia ativo: andar até 90 dias.
  let guard = 90;
  while (dias.length < qtd && guard-- > 0) {
    const dow = d.getDay();
    const iso = diaToISO(d);
    if (diasAtivos.has(dow) && !feriados.has(iso)) {
      dias.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function diaToISO(d: Date) {
  // Local YYYY-MM-DD, evita drift de timezone que toISOString() introduz.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
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
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [waUrl, setWaUrl] = useState('');
  const [diasAtivos, setDiasAtivos] = useState<Set<number>>(new Set());
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [carregandoJanelas, setCarregandoJanelas] = useState(true);

  // Carrega as janelas de atendimento configuradas no painel super admin.
  useEffect(() => {
    let cancelado = false;
    fetch('/api/public/janelas-atendimento')
      .then(r => r.json())
      .then(d => {
        if (cancelado) return;
        const ativos = new Set<number>();
        const janelas = d?.janelas || {};
        for (const k of Object.keys(janelas)) {
          if (janelas[k]) ativos.add(Number(k));
        }
        setDiasAtivos(ativos);
        setFeriados(new Set(Array.isArray(d?.feriadosBloqueados) ? d.feriadosBloqueados : []));
      })
      .catch(() => { /* mantém vazio → mostra "carregando" */ })
      .finally(() => { if (!cancelado) setCarregandoJanelas(false); });
    return () => { cancelado = true; };
  }, []);

  const dias = getProximosDias(10, diasAtivos, feriados);

  // Sempre que troca o dia, refaz a busca de horários disponíveis e zera o horário escolhido.
  useEffect(() => {
    if (!dataSelecionada) {
      setSlots([]);
      return;
    }
    let cancelado = false;
    const dia = diaToISO(dataSelecionada);
    setCarregandoSlots(true);
    setHorario('');
    fetch(`/api/public/horarios-disponiveis?dia=${dia}`)
      .then(r => r.json())
      .then(d => {
        if (cancelado) return;
        setSlots(Array.isArray(d?.slots) ? d.slots : []);
      })
      .catch(() => { if (!cancelado) setSlots([]); })
      .finally(() => { if (!cancelado) setCarregandoSlots(false); });
    return () => { cancelado = true; };
  }, [dataSelecionada]);

  const enviar = async () => {
    if (!nome.trim() || !telefoneValido(whatsapp) || !dataSelecionada || !horario || enviando) return;
    setEnviando(true);
    setErro('');

    const dataFormatada = formatDataCompleta(dataSelecionada);
    const dia = diaToISO(dataSelecionada);

    // 1) Salva o lead+agendamento no servidor — bloqueia se 409 (slot tomado entre escolher e enviar).
    try {
      const params = new URLSearchParams(window.location.search);
      const resp = await fetch('/api/public/agendar-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          empresa: empresa.trim(),
          dia,
          horario,
          utm_source: params.get('utm_source') || undefined,
          utm_medium: params.get('utm_medium') || undefined,
          utm_campaign: params.get('utm_campaign') || undefined,
          utm_content: params.get('utm_content') || undefined,
          utm_term: params.get('utm_term') || undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        }),
      });

      if (resp.status === 409) {
        const data = await resp.json().catch(() => ({}));
        if (data?.motivo === 'duplicata') {
          // Mesmo whatsapp já tem demo marcada — não recarrega slots, só avisa.
          setErro(data?.erro || 'Você já tem uma demo marcada nesse WhatsApp.');
        } else {
          // Slot foi tomado por outra pessoa — limpa horário e recarrega disponíveis.
          setHorario('');
          setErro(data?.erro || 'Esse horário acabou de ser reservado. Escolha outro.');
          try {
            const r2 = await fetch(`/api/public/horarios-disponiveis?dia=${dia}`);
            const d2 = await r2.json();
            setSlots(Array.isArray(d2?.slots) ? d2.slots : []);
          } catch { /* ignore */ }
        }
        setEnviando(false);
        return;
      }

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setErro(data?.erro || 'Não foi possível registrar agora. Tente novamente.');
        setEnviando(false);
        return;
      }
    } catch (err) {
      console.error('Falha ao registrar lead:', err);
      setErro('Falha de conexão. Tente novamente.');
      setEnviando(false);
      return;
    }

    // 2) Dispara evento de conversão pro GTM/GA4/Ads/Pixel
    trackEvent('lead_demo_booked', {
      empresa: empresa.trim() || undefined,
      data: dataFormatada,
      horario,
    });
    trackLead({ tipo: 'agendar_demo', empresa: empresa.trim() || undefined });

    // 3) Monta o link do WhatsApp pra mostrar na tela de sucesso.
    // Não chamamos window.open programaticamente porque alguns browsers
    // bloqueiam pop-up disparado depois de await — o user precisa clicar.
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

    setWaUrl(`https://wa.me/${LINKS.whatsapp.number}?text=${encodeURIComponent(msg)}`);
    setEnviado(true);
    setEnviando(false);
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
            Você vai receber uma confirmação automática no seu WhatsApp em alguns segundos.
            Se quiser, mande já uma mensagem pra gente também:
          </p>

          <div className="flex flex-col gap-3 pt-4">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30"
              >
                <Send size={18} /> Mandar mensagem no WhatsApp
              </a>
            )}
            <Link
              href="/signup"
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all text-center"
            >
              Criar minha conta grátis
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

  const podEnviar = nome.trim() && telefoneValido(whatsapp) && dataSelecionada && horario;

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
              inputMode="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(mascaraTelefone(e.target.value))}
              placeholder="(32) 99999-9999"
              required
              aria-label="WhatsApp com DDD"
              className={`w-full bg-purple-950/20 border ${
                whatsapp && !telefoneValido(whatsapp) ? 'border-red-500/60' : 'border-purple-500/20 hover:border-purple-500/40 focus:border-purple-500'
              } rounded-xl p-4 text-white placeholder-gray-600 outline-none transition-colors`}
            />
            {whatsapp && !telefoneValido(whatsapp) && (
              <p className="text-xs text-red-400">Informe um telefone válido com DDD.</p>
            )}
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
            {carregandoJanelas ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                <Loader2 size={16} className="animate-spin" /> Buscando dias disponíveis…
              </div>
            ) : dias.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                Sem dias disponíveis para agendamento no momento. Fale com a gente pelo WhatsApp.
              </p>
            ) : (
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
            )}
          </div>

          {/* Escolher horário */}
          {dataSelecionada && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-purple-400" /> Escolha o horário
              </label>

              {carregandoSlots ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <Loader2 size={16} className="animate-spin" /> Buscando horários disponíveis…
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  Não há horários disponíveis nesse dia. Escolha outro.
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {slots.map(h => {
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
              )}
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

              {erro && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {erro}
                </div>
              )}

              <button
                onClick={enviar}
                disabled={enviando}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
              >
                {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {enviando ? 'Reservando…' : 'Confirmar pelo WhatsApp'}
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
