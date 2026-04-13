'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Save, Scale, AlertCircle, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  aberto: boolean;
  onClose: () => void;
  usuarios: any[];
  onConfirmar: () => void;
  funcionarioPreSelecionado?: string | null;
  tipoPreSelecionado?: 'PAGAMENTO_HE' | 'COMPENSACAO_FOLGA' | 'CORRECAO_MANUAL' | null;
}

const TIPOS = [
  { value: 'PAGAMENTO_HE', label: 'Pagamento de horas extras', desc: 'Funcionário recebeu em dinheiro. Remove do banco.' },
  { value: 'COMPENSACAO_FOLGA', label: 'Compensação com folga', desc: 'Funcionário vai folgar (total ou parcial). A meta do dia é reduzida.' },
  { value: 'CORRECAO_MANUAL', label: 'Correção manual', desc: 'Corrigir erro no banco. Ex: horas não contabilizadas, sistema fora do ar, ajuste retroativo.' },
];

function getMesesDisponiveis() {
  const meses = [];
  const agora = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const value = format(d, 'yyyy-MM');
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    meses.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return meses;
}

export default function ModalAjusteBancoHoras({ aberto, onClose, usuarios, onConfirmar, funcionarioPreSelecionado, tipoPreSelecionado }: Props) {
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);
  const [tipo, setTipo] = useState('PAGAMENTO_HE');
  const [direcao, setDirecao] = useState<'debito' | 'credito'>('debito');
  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
  const [mesRef, setMesRef] = useState(format(new Date(), 'yyyy-MM'));
  const [dataFolga, setDataFolga] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [buscaFunc, setBuscaFunc] = useState('');
  const [dropdownFunc, setDropdownFunc] = useState(false);
  const dropdownFuncRef = useRef<HTMLDivElement>(null);
  const [saldosMes, setSaldosMes] = useState<Record<string, { saldo: string; saldoMinutos: number }>>({});
  const [saldosAcum, setSaldosAcum] = useState<Record<string, { saldo: string; saldoMinutos: number }>>({});
  const [carregandoSaldo, setCarregandoSaldo] = useState(false);

  const meses = getMesesDisponiveis();
  const funcionarios = usuarios.filter((u: any) => u.cargo !== 'ADMIN');

  // Pré-seleção quando modal abre
  useEffect(() => {
    if (!aberto) return;
    if (funcionarioPreSelecionado) setUsuarioIds([funcionarioPreSelecionado]);
    if (tipoPreSelecionado) setTipo(tipoPreSelecionado);
  }, [aberto, funcionarioPreSelecionado, tipoPreSelecionado]);

  // Buscar saldos quando mudar seleção ou mês
  useEffect(() => {
    if (!aberto || usuarioIds.length === 0) { setSaldosMes({}); setSaldosAcum({}); return; }
    setCarregandoSaldo(true);
    Promise.all([
      axios.get(`/api/admin/banco-horas-equipe?mes=${mesRef}`),
      axios.get('/api/admin/banco-horas-equipe'),
    ]).then(([resMes, resAcum]) => {
      const mapMes: Record<string, any> = {};
      const mapAcum: Record<string, any> = {};
      (resMes.data.funcionarios || []).forEach((f: any) => {
        mapMes[f.id] = { saldo: f.saldo, saldoMinutos: f.saldoMinutos };
      });
      (resAcum.data.funcionarios || []).forEach((f: any) => {
        mapAcum[f.id] = { saldo: f.saldo, saldoMinutos: f.saldoMinutos };
      });
      setSaldosMes(mapMes);
      setSaldosAcum(mapAcum);
    }).catch(() => {}).finally(() => setCarregandoSaldo(false));
  }, [aberto, usuarioIds.length, mesRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownFuncRef.current && !dropdownFuncRef.current.contains(e.target as Node)) {
        setDropdownFunc(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!aberto) return null;

  const isCompensacao = tipo === 'COMPENSACAO_FOLGA';
  const isCorrecao = tipo === 'CORRECAO_MANUAL';
  const totalMinutos = (parseInt(horas || '0') * 60) + parseInt(minutos || '0');
  const tipoSelecionado = TIPOS.find(t => t.value === tipo);

  // Pagamento e compensação sempre removem. Correção manual escolhe direção.
  const isDebito = isCorrecao ? direcao === 'debito' : true;

  const toggleFuncionario = (id: string) => {
    setUsuarioIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => {
    const filtrados = funcionarios.filter((u: any) =>
      !buscaFunc.trim() || u.nome.toLowerCase().includes(buscaFunc.trim().toLowerCase())
    );
    const todosSelecionados = filtrados.every((u: any) => usuarioIds.includes(u.id));
    if (todosSelecionados) {
      setUsuarioIds(prev => prev.filter(id => !filtrados.find((u: any) => u.id === id)));
    } else {
      const novos = filtrados.map((u: any) => u.id);
      setUsuarioIds(prev => [...new Set([...prev, ...novos])]);
    }
  };

  const salvar = async () => {
    if (usuarioIds.length === 0) { toast.error('Selecione ao menos um funcionário'); return; }
    if (totalMinutos === 0) { toast.error('Informe a quantidade de horas'); return; }
    if (!motivo.trim()) { toast.error('Informe o motivo'); return; }
    if (isCompensacao && !dataFolga) { toast.error('Informe a data da folga'); return; }

    const [ano, mes] = mesRef.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataRef = `${mesRef}-${String(ultimoDia).padStart(2, '0')}`;
    const minutosFinais = isDebito ? -totalMinutos : totalMinutos;

    setSalvando(true);
    setProgresso(0);
    let sucesso = 0;
    let erros = 0;

    for (let i = 0; i < usuarioIds.length; i++) {
      try {
        await axios.post('/api/admin/ajuste-banco', {
          usuarioId: usuarioIds[i],
          data: dataRef,
          ...(isCompensacao ? { dataFolga } : {}),
          minutos: minutosFinais,
          tipo,
          motivo: motivo.trim(),
        });
        sucesso++;
      } catch {
        erros++;
      }
      setProgresso(i + 1);
    }

    setSalvando(false);
    setProgresso(0);

    if (erros === 0) {
      toast.success(sucesso === 1 ? 'Ajuste lançado!' : `${sucesso} ajustes lançados!`);
    } else {
      toast.warning(`${sucesso} lançado(s), ${erros} com erro.`);
    }

    onClose();
    setUsuarioIds([]); setHoras(''); setMinutos(''); setMotivo(''); setBuscaFunc('');
    onConfirmar();
  };

  const nomesSelecionados = usuarioIds.map(id => funcionarios.find((u: any) => u.id === id)?.nome || '').filter(Boolean);
  const mesLabel = meses.find(m => m.value === mesRef)?.label || '';

  const formatDataBR = (d: string) => {
    const [a, m, dia] = d.split('-');
    return `${dia}/${m}/${a}`;
  };

  const funcsFiltrados = funcionarios.filter((u: any) =>
    !buscaFunc.trim() || u.nome.toLowerCase().includes(buscaFunc.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 lg:left-64 z-[200] flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface-solid border border-border-default w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border-subtle p-5">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Scale size={20} className="text-purple-400" /> Gerenciar Horas Extras
          </h3>
          <button onClick={onClose} className="text-text-faint hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70dvh] overflow-y-auto">
          {/* Funcionários - multi-select */}
          <div className="space-y-1" ref={dropdownFuncRef}>
            <label className="text-[10px] text-text-muted font-bold uppercase ml-1">
              Funcionário(s) {usuarioIds.length > 0 && <span className="text-purple-400">({usuarioIds.length})</span>}
            </label>

            {/* Tags dos selecionados */}
            {usuarioIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {nomesSelecionados.map((nome, i) => (
                  <span key={usuarioIds[i]} className="inline-flex items-center gap-1 bg-purple-500/15 text-purple-300 px-2 py-1 rounded-lg text-xs font-bold">
                    {nome}
                    <button onClick={() => toggleFuncionario(usuarioIds[i])} className="hover:text-white">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-text-faint pointer-events-none" />
              <input
                type="text"
                value={buscaFunc}
                onChange={e => { setBuscaFunc(e.target.value); setDropdownFunc(true); }}
                onFocus={() => setDropdownFunc(true)}
                placeholder="Buscar funcionário..."
                className="w-full bg-page border border-border-input p-3 pl-9 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500"
              />
            </div>
            {dropdownFunc && (
              <div className="bg-page border border-border-input rounded-xl max-h-44 overflow-y-auto shadow-lg">
                {funcsFiltrados.length > 1 && (
                  <button
                    type="button"
                    onClick={selecionarTodos}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-purple-400 hover:bg-hover-bg transition-colors border-b border-border-subtle"
                  >
                    {funcsFiltrados.every((u: any) => usuarioIds.includes(u.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                )}
                {funcsFiltrados.map((u: any) => {
                  const selecionado = usuarioIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleFuncionario(u.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-hover-bg transition-colors flex items-center gap-2 ${
                        selecionado ? 'text-purple-400' : 'text-text-primary'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selecionado ? 'bg-purple-500 border-purple-500' : 'border-border-input'
                      }`}>
                        {selecionado && <Check size={10} className="text-white" />}
                      </div>
                      <span className={selecionado ? 'font-bold' : ''}>{u.nome}</span>
                    </button>
                  );
                })}
                {funcsFiltrados.length === 0 && (
                  <p className="px-3 py-2.5 text-sm text-text-dim">Nenhum encontrado</p>
                )}
              </div>
            )}
          </div>

          {/* Mês de referência */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Mês de referência</label>
            <select
              value={mesRef}
              onChange={e => setMesRef(e.target.value)}
              className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500 appearance-none"
            >
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Saldo(s) do(s) funcionário(s) */}
          {usuarioIds.length === 1 && (
            <div className="flex gap-2">
              <div className="flex-1 bg-page border border-border-input rounded-xl p-3">
                <p className="text-[10px] text-text-faint font-bold uppercase">Saldo {mesLabel.split(' ')[0]}</p>
                {carregandoSaldo ? (
                  <div className="w-16 h-4 bg-hover-bg rounded animate-pulse mt-1" />
                ) : saldosMes[usuarioIds[0]] ? (
                  <p className={`text-sm font-bold font-mono ${saldosMes[usuarioIds[0]].saldoMinutos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saldosMes[usuarioIds[0]].saldo}
                  </p>
                ) : (
                  <p className="text-sm text-text-dim">-</p>
                )}
              </div>
              <div className="flex-1 bg-page border border-border-input rounded-xl p-3">
                <p className="text-[10px] text-text-faint font-bold uppercase">Acumulado</p>
                {carregandoSaldo ? (
                  <div className="w-16 h-4 bg-hover-bg rounded animate-pulse mt-1" />
                ) : saldosAcum[usuarioIds[0]] ? (
                  <p className={`text-sm font-bold font-mono ${saldosAcum[usuarioIds[0]].saldoMinutos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saldosAcum[usuarioIds[0]].saldo}
                  </p>
                ) : (
                  <p className="text-sm text-text-dim">-</p>
                )}
              </div>
            </div>
          )}
          {usuarioIds.length > 1 && (
            <p className="text-[10px] text-text-dim ml-1">{usuarioIds.length} funcionários selecionados — o mesmo ajuste será aplicado a todos</p>
          )}

          {/* O que você quer fazer? */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-muted font-bold uppercase ml-1">O que deseja fazer?</label>
            <div className="space-y-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    tipo === t.value
                      ? t.value === 'CORRECAO_MANUAL'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        : t.value === 'COMPENSACAO_FOLGA'
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-page border-border-input text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Direção (só para correção manual) */}
          {isCorrecao && (
            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Operação</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirecao('credito')}
                  className={`p-3 rounded-xl text-sm font-bold transition-all ${
                    direcao === 'credito'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-page border border-border-input text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  + Adicionar horas
                </button>
                <button
                  type="button"
                  onClick={() => setDirecao('debito')}
                  className={`p-3 rounded-xl text-sm font-bold transition-all ${
                    direcao === 'debito'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-page border border-border-input text-text-muted hover:bg-hover-bg'
                  }`}
                >
                  - Remover horas
                </button>
              </div>
            </div>
          )}

          {/* Data da folga (só para compensação) */}
          {isCompensacao && (
            <div className="space-y-1">
              <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Data da folga</label>
              <input
                type="date"
                value={dataFolga}
                onChange={e => setDataFolga(e.target.value)}
                className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-text-dim ml-1">A meta deste dia será reduzida pelas horas informadas</p>
            </div>
          )}

          {/* Quantidade */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-muted font-bold uppercase ml-1">
              {isCompensacao ? 'Horas de folga' : 'Quantidade de horas'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={horas}
                  onChange={e => setHoras(e.target.value)}
                  placeholder="0"
                  className="w-full bg-page border border-border-input p-3 pr-8 rounded-xl text-text-primary text-lg font-bold text-center outline-none focus:border-purple-500"
                />
                <span className="absolute right-3 top-3.5 text-text-faint text-sm">h</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutos}
                  onChange={e => setMinutos(e.target.value)}
                  placeholder="0"
                  className="w-full bg-page border border-border-input p-3 pr-10 rounded-xl text-text-primary text-lg font-bold text-center outline-none focus:border-purple-500"
                />
                <span className="absolute right-3 top-3.5 text-text-faint text-sm">min</span>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-[10px] text-text-muted font-bold uppercase ml-1">Motivo (obrigatório)</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={
                isCompensacao
                  ? 'Ex: Folga para compensar horas extras de fevereiro'
                  : isCorrecao
                    ? 'Ex: Sistema ficou fora do ar, funcionário trabalhou 2h sem registro'
                    : 'Ex: Pagamento de horas extras em folha'
              }
              className="w-full bg-page border border-border-input p-3 rounded-xl text-text-primary text-sm h-16 resize-none outline-none focus:border-purple-500"
            />
          </div>

          {/* Resumo */}
          {totalMinutos > 0 && usuarioIds.length > 0 && (
            <div className={`p-3 rounded-xl border text-sm ${
              isCompensacao
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
                : isDebito
                  ? 'bg-red-500/10 border-red-500/20 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  {isCompensacao ? (
                    <>
                      <p className="font-bold">
                        Folga de {Math.floor(totalMinutos / 60)}h{String(totalMinutos % 60).padStart(2, '0')}
                        {usuarioIds.length > 1 ? ` para ${usuarioIds.length} funcionários` : ` para ${nomesSelecionados[0]}`}
                      </p>
                      <p className="text-[11px] opacity-70 mt-0.5">
                        Em {formatDataBR(dataFolga)} · Ref. {mesLabel}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold">
                        {isDebito ? 'Remover' : 'Adicionar'} {Math.floor(totalMinutos / 60)}h{String(totalMinutos % 60).padStart(2, '0')}
                        {usuarioIds.length > 1 ? ` de ${usuarioIds.length} funcionários` : ` de ${nomesSelecionados[0]}`}
                      </p>
                      <p className="text-[11px] opacity-70 mt-0.5">
                        Ref. {mesLabel} · {tipoSelecionado?.label}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-2">
          {salvando ? (
            <div className="space-y-2">
              <div className="w-full h-2 bg-hover-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(progresso / usuarioIds.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{progresso}/{usuarioIds.length}</p>
            </div>
          ) : (
            <button
              onClick={salvar}
              disabled={totalMinutos === 0 || usuarioIds.length === 0 || !motivo.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-elevated-solid disabled:text-text-faint text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Save size={18} /> Confirmar{usuarioIds.length > 1 ? ` (${usuarioIds.length})` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
