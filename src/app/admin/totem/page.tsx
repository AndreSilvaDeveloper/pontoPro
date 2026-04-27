'use client';

import { useEffect, useState } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

type Totem = {
  id: string;
  nome: string;
  codigo: string | null;
  codigoExpiraEm: string | null;
  pareadoEm: string | null;
  ultimoUso: string | null;
  ativo: boolean;
  criadoEm: string;
};

export default function AdminTotemPage() {
  const [totens, setTotens] = useState<Totem[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigo, setNovoCodigo] = useState<{ codigo: string; nome: string } | null>(null);
  const [bloqueado, setBloqueado] = useState<string | null>(null);
  const [resetando, setResetando] = useState<string | null>(null);
  const [mostrarAjuda, setMostrarAjuda] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/totem/devices');
      if (res.ok) {
        const data = await res.json();
        setTotens(data);
      } else if (res.status === 403) {
        // OK
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const criar = async () => {
    const nome = novoNome.trim() || 'Totem';
    setCriando(true);
    try {
      const res = await fetch('/api/admin/totem/parear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setNovoCodigo({ codigo: data.codigo, nome: data.nome });
        setNovoNome('');
        carregar();
      } else if (res.status === 402) {
        setBloqueado(data?.erro || 'Modo Totem indisponível no seu plano.');
      } else {
        toast.error(data?.erro || 'Erro ao criar totem.');
      }
    } finally {
      setCriando(false);
    }
  };

  const resetar = async (id: string, nome: string) => {
    if (!confirm(
      `Resetar o totem "${nome}"?\n\n` +
      `O tablet atual vai parar de funcionar IMEDIATAMENTE. ` +
      `Você vai precisar parear ele de novo (ou em outro tablet) com o novo código.`
    )) return;
    setResetando(id);
    try {
      const res = await fetch('/api/admin/totem/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setNovoCodigo({ codigo: data.codigo, nome: data.nome });
        carregar();
      } else {
        toast.error(data?.erro || 'Erro ao resetar.');
      }
    } finally {
      setResetando(null);
    }
  };

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Remover o totem "${nome}"? Ele vai parar de funcionar imediatamente.`)) return;
    const res = await fetch('/api/admin/totem/devices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success('Totem removido.');
      carregar();
    } else {
      toast.error('Erro ao remover.');
    }
  };

  const copiar = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado.');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary inline-flex items-center gap-2">
            <Smartphone size={24} className="text-purple-400" />
            Totens
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Tablets em modo "totem" — funcionário bate ponto pelo rosto, sem precisar logar.
          </p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </header>

      {bloqueado && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
          <AlertCircle className="text-amber-400 shrink-0" />
          <div>
            <div className="font-semibold text-amber-300">Modo Totem indisponível</div>
            <p className="text-sm text-text-secondary mt-1">{bloqueado}</p>
            <p className="text-sm text-text-secondary mt-1">
              O Modo Totem é um adicional pago. Fale com o suporte WorkID pra ativar na sua conta.
            </p>
          </div>
        </div>
      )}

      {/* Instruções de uso */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 overflow-hidden">
        <button
          onClick={() => setMostrarAjuda(v => !v)}
          className="w-full flex items-center gap-3 p-4 hover:bg-purple-500/5 transition-colors"
        >
          <Info className="text-purple-400 shrink-0" size={20} />
          <div className="flex-1 text-left">
            <div className="font-semibold text-text-primary">Como funciona o Modo Totem</div>
            <p className="text-xs text-text-muted mt-0.5">
              Tablet único pra equipe inteira bater ponto pelo rosto, sem login.
            </p>
          </div>
          {mostrarAjuda ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
        </button>

        {mostrarAjuda && (
          <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-text-secondary">
            <div>
              <div className="font-semibold text-text-primary mb-1">📋 O que você precisa</div>
              <ul className="list-disc pl-5 space-y-1 text-text-secondary">
                <li>Um tablet (ou celular antigo) com Chrome/Edge atualizado e câmera frontal funcionando</li>
                <li>Internet estável no local (Wi-Fi)</li>
                <li>Foto cadastrada de cada funcionário que vai usar o totem (em <span className="text-purple-300">Gestão da Equipe</span>)</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-text-primary mb-1">🔧 Passo-a-passo (1ª vez)</div>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  Aqui no painel, clique em <span className="text-purple-300 font-medium">"Gerar código"</span> abaixo. Vai aparecer um número de 6 dígitos.
                </li>
                <li>
                  No tablet, abra o navegador e digite: <code className="bg-page/50 border border-border-subtle px-2 py-0.5 rounded text-purple-300">{typeof window !== 'undefined' ? `${window.location.origin}/totem/parear` : '/totem/parear'}</code>
                </li>
                <li>
                  Digite os 6 dígitos no tablet e toque em <span className="text-purple-300 font-medium">"Parear"</span>.
                </li>
                <li>
                  O tablet vai abrir a tela de bater ponto. Pronto — pode deixar lá. Recomendamos <span className="text-purple-300">"Adicionar à tela de início"</span> no Chrome pra virar atalho.
                </li>
              </ol>
            </div>

            <div>
              <div className="font-semibold text-text-primary mb-1">👤 Uso diário</div>
              <p>Funcionário chega no tablet, toca no botão grande <span className="text-purple-300">"BATER PONTO"</span>, mostra o rosto. O sistema reconhece e registra automaticamente (Entrada, Saída Almoço, etc).</p>
            </div>

            <div className="flex gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-amber-200">
                <div className="font-semibold mb-0.5">Tablet roubado, perdido ou quebrado?</div>
                <p>Use o botão <span className="font-semibold">"Resetar"</span> no totem correspondente. Isso invalida o tablet antigo na hora e gera um código novo pra você parear em outro device.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card de criação */}
      <div className="rounded-2xl border border-border-subtle bg-elevated/40 p-5">
        <div className="font-semibold mb-3">Adicionar novo totem</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex: Recepção, Portaria, Refeitório"
            className="flex-1 px-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint"
          />
          <button
            onClick={criar}
            disabled={criando}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {criando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Gerar código
          </button>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Você vai receber um código de 6 dígitos pra digitar no tablet uma vez. Depois o tablet fica em modo totem.
        </p>
      </div>

      {/* Modal de código novo */}
      {novoCodigo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setNovoCodigo(null)}
        >
          <div
            className="bg-elevated border border-purple-500/30 rounded-3xl p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">Código gerado</h3>
            <p className="text-sm text-text-muted mb-6">
              No tablet, abra <code className="text-purple-300">/totem/parear</code> e digite:
            </p>
            <div className="bg-page/50 border border-purple-500/20 rounded-2xl p-4 mb-4">
              <div className="text-5xl font-extrabold tracking-[0.3em] text-text-primary">
                {novoCodigo.codigo}
              </div>
              <div className="mt-2 text-xs text-text-muted">{novoCodigo.nome}</div>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => copiar(novoCodigo.codigo)}
                className="inline-flex items-center gap-2 bg-elevated-solid/50 hover:bg-elevated-solid text-text-secondary px-4 py-2 rounded-xl text-sm"
              >
                <Copy size={16} /> Copiar
              </button>
              <button
                onClick={() => setNovoCodigo(null)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Fechar
              </button>
            </div>
            <p className="mt-5 text-[11px] text-text-faint">
              Esse código expira em 30 minutos. Se vencer, gere um novo.
            </p>
          </div>
        </div>
      )}

      {/* Lista de totens */}
      <div className="rounded-2xl border border-border-subtle bg-elevated/40 overflow-hidden">
        {loading && totens.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <Loader2 className="mx-auto animate-spin mb-2" /> Carregando…
          </div>
        ) : totens.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            Nenhum totem cadastrado. Adicione um acima.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {totens.map(t => {
              const codigoValido = t.codigo && t.codigoExpiraEm && new Date(t.codigoExpiraEm) > new Date();
              return (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-text-primary">{t.nome}</div>
                    <div className="text-xs text-text-muted mt-0.5 flex flex-wrap gap-x-3">
                      {t.pareadoEm ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={12} /> Pareado em {new Date(t.pareadoEm).toLocaleDateString('pt-BR')}
                        </span>
                      ) : codigoValido ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Clock size={12} /> Aguardando código {t.codigo} (expira em {Math.max(0, Math.round((new Date(t.codigoExpiraEm!).getTime() - Date.now()) / 60000))}min)
                        </span>
                      ) : (
                        <span className="text-text-muted">Código expirado — remova e crie outro</span>
                      )}
                      {t.ultimoUso && (
                        <span>· último uso {new Date(t.ultimoUso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {codigoValido && t.codigo && (
                      <button
                        onClick={() => copiar(t.codigo!)}
                        className="inline-flex items-center gap-1 text-xs bg-elevated-solid/50 hover:bg-elevated-solid text-text-secondary px-3 py-1.5 rounded-lg"
                      >
                        <Copy size={12} /> {t.codigo}
                      </button>
                    )}
                    <button
                      onClick={() => resetar(t.id, t.nome)}
                      disabled={resetando === t.id}
                      className="inline-flex items-center gap-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 disabled:opacity-50"
                      title="Invalida o tablet atual e gera um novo código de pareamento"
                    >
                      {resetando === t.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                      Resetar
                    </button>
                    <button
                      onClick={() => excluir(t.id, t.nome)}
                      className="inline-flex items-center gap-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
