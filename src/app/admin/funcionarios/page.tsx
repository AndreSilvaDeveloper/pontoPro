'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, MapPin, RefreshCw, User, Upload, Clock, Pencil, X, Save, Trash2, Briefcase, Plus, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

// Importa o Mapa dinamicamente para não quebrar no servidor
const MapaCaptura = dynamic(() => import('@/components/MapaCaptura'), { 
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Carregando Mapa...</div>
});

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  tituloCargo?: string;
  latitudeBase: number;
  longitudeBase: number;
  raioPermitido: number;
  fotoPerfilUrl?: string;
  jornada?: any;
  pontoLivre?: boolean;
  locaisAdicionais?: any[];
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tituloCargo, setTituloCargo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  
  // Novos Campos (Cerca Virtual Avançada)
  const [pontoLivre, setPontoLivre] = useState(false);
  const [locaisExtras, setLocaisExtras] = useState<any[]>([]);
  const [novoLocal, setNovoLocal] = useState({ nome: '', lat: '', lng: '', raio: '100' });

  const jornadaPadrao = {
    seg: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    ter: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qua: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    qui: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sex: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
    sab: { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: false },
    dom: { e1: '', s1: '', e2: '', s2: '', ativo: false },
  };

  const [jornada, setJornada] = useState<any>(jornadaPadrao);

  useEffect(() => { carregarLista(); }, []);

  const carregarLista = async () => {
    try {
        const res = await axios.get('/api/admin/funcionarios');
        setFuncionarios(res.data);
    } catch (e) { console.error("Erro ao carregar lista"); }
  };

  const abrirNovoCadastro = () => {
    setIdEdicao(null);
    setNome(''); setEmail(''); setTituloCargo(''); 
    setLat(''); setLng(''); setRaio('100');
    setJornada(jornadaPadrao);
    setPontoLivre(false); setLocaisExtras([]); // Reset novos campos
    setFotoArquivo(null);
    setShowModal(true);
  };

  const iniciarEdicao = (f: Funcionario) => {
    setIdEdicao(f.id);
    setNome(f.nome);
    setEmail(f.email);
    setTituloCargo(f.tituloCargo || '');
    setLat(f.latitudeBase.toString());
    setLng(f.longitudeBase.toString());
    setRaio(f.raioPermitido.toString());
    setJornada(f.jornada || jornadaPadrao);
    setPontoLivre(f.pontoLivre || false);
    setLocaisExtras(f.locaisAdicionais || []);
    setFotoArquivo(null);
    setShowModal(true);
  };

  const fecharModal = () => { setShowModal(false); setIdEdicao(null); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pontoLivre && (!lat || !lng)) return alert('Defina a localização principal (use o mapa ou botão GPS)!');
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('tituloCargo', tituloCargo);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('raio', raio);
      formData.append('jornada', JSON.stringify(jornada)); 
      
      // Envia campos novos
      formData.append('pontoLivre', String(pontoLivre));
      formData.append('locaisAdicionais', JSON.stringify(locaisExtras));

      if (fotoArquivo) formData.append('foto', fotoArquivo);

      if (idEdicao) {
        formData.append('id', idEdicao);
        await axios.put('/api/admin/funcionarios', formData);
        alert('Atualizado com sucesso!');
      } else {
        await axios.post('/api/admin/funcionarios', formData);
        alert('Cadastrado com sucesso!');
      }
      
      fecharModal();
      carregarLista();
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const excluirFuncionario = async (id: string, nome: string) => {
    if (confirm(`ATENÇÃO: Tem certeza que deseja excluir ${nome}?\nIsso apagará TODO o histórico.`)) {
      try {
        await axios.delete(`/api/admin/funcionarios?id=${id}`);
        alert('Excluído.');
        carregarLista();
      } catch (error) { alert('Erro ao excluir.'); }
    }
  };

  const updateJornada = (dia: string, campo: string, valor: any) => {
    setJornada((prev: any) => ({
        ...prev,
        [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  // Botão antigo que você queria manter
  const pegarLocalizacaoAtual = (destino: 'PRINCIPAL' | 'EXTRA') => {
    navigator.geolocation.getCurrentPosition((pos) => {
      if (destino === 'PRINCIPAL') {
          setLat(String(pos.coords.latitude));
          setLng(String(pos.coords.longitude));
      } else {
          setNovoLocal({ ...novoLocal, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
      }
    }, (erro) => alert("Erro ao pegar GPS: " + erro.message));
  };

  const addLocalExtra = () => {
      if(!novoLocal.nome || !novoLocal.lat) return alert("Defina um nome e uma localização.");
      setLocaisExtras([...locaisExtras, { ...novoLocal }]);
      setNovoLocal({ nome: '', lat: '', lng: '', raio: '100' });
  };

  const removeLocalExtra = (idx: number) => {
      const novaLista = [...locaisExtras];
      novaLista.splice(idx, 1);
      setLocaisExtras(novaLista);
  };

  const resetarSenha = async (id: string, nomeFunc: string) => {
    if (!confirm(`Resetar senha de ${nomeFunc}?`)) return;
    try { await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: id }); alert('Senha resetada!'); } catch (error) { alert('Erro ao resetar.'); }
  };

  // Função chamada quando o usuário clica no MAPA
  const aoClicarNoMapa = (novaLat: number, novaLng: number) => {
      setLat(String(novaLat));
      setLng(String(novaLng));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOPO */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-400">Gestão de Equipe</h1>
            <p className="text-slate-400 text-sm">Gerencie seus funcionários</p>
          </div>
          <div className="flex gap-3">
            <button onClick={abrirNovoCadastro} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20">
                <UserPlus size={20} /> Novo Cadastro
            </button>
            <Link href="/admin" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-colors">
                <ArrowLeft size={20} /> Voltar
            </Link>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="grid gap-3">
          {funcionarios.length === 0 && <p className="text-slate-500 text-center py-10">Nenhum funcionário cadastrado.</p>}
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-600 transition-colors shadow-md">
              <div className="flex items-center gap-4">
                {func.fotoPerfilUrl ? (
                  <img src={func.fotoPerfilUrl} alt={func.nome} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    <User size={20} className="text-slate-500" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-lg">{func.nome}</h3>
                  <div className="flex flex-col">
                    <p className="text-sm text-slate-400">{func.email}</p>
                    <div className="flex gap-2 mt-1">
                        {func.tituloCargo && <span className="text-[10px] bg-slate-800 px-1.5 rounded text-purple-400 font-bold uppercase">{func.tituloCargo}</span>}
                        {func.pontoLivre && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 rounded">Livre</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => iniciarEdicao(func)} className="p-2.5 bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-900/50" title="Editar"><Pencil size={18} /></button>
                <button onClick={() => resetarSenha(func.id, func.nome)} className="p-2.5 bg-yellow-900/30 text-yellow-500 hover:bg-yellow-600 hover:text-white rounded-lg border border-yellow-900/50" title="Resetar Senha"><RefreshCw size={18} /></button>
                <button onClick={() => excluirFuncionario(func.id, func.nome)} className="p-2.5 bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white rounded-lg border border-red-900/50" title="Excluir"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL DE CADASTRO */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl my-8 relative flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-2xl sticky top-0 z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {idEdicao ? <><Pencil size={20} className="text-blue-400"/> Editar Funcionário</> : <><UserPlus size={20} className="text-green-400"/> Novo Funcionário</>}
                </h2>
                <button onClick={fecharModal} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form onSubmit={salvar} className="space-y-6">
                    
                    {/* DADOS BÁSICOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Nome Completo</label>
                            <input className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-purple-500" value={nome} onChange={e => setNome(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Email Profissional</label>
                            <input type="email" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-purple-500" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block flex items-center gap-2"><Briefcase size={12}/> Cargo / Função (Opcional)</label>
                        <input placeholder="Ex: Vendedor, Motorista, Gerente..." className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg text-white outline-none focus:border-purple-500" value={tituloCargo} onChange={e => setTituloCargo(e.target.value)} />
                    </div>

                    {/* JORNADA DE TRABALHO (RESTAURADA!) */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-sm text-slate-300 mb-4 font-bold flex items-center gap-2"><Clock size={16} className="text-purple-400"/> Jornada de Trabalho</p>
                        <div className="space-y-3">
                            {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
                            <div key={dia} className="flex flex-col lg:flex-row lg:items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                <div className="flex items-center justify-between lg:w-32">
                                    <span className="font-bold uppercase text-xs text-slate-500 w-8">{dia}</span>
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                                        <input type="checkbox" checked={jornada[dia]?.ativo} onChange={(e) => updateJornada(dia, 'ativo', e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-0"/>
                                        Trabalha
                                    </label>
                                </div>
                                {jornada[dia]?.ativo && (
                                    <div className="flex flex-wrap gap-3 flex-1">
                                        <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                                            <span className="text-[10px] text-slate-500">MANHÃ</span>
                                            <input type="time" value={jornada[dia].e1} onChange={e=>updateJornada(dia, 'e1', e.target.value)} className="bg-transparent text-white text-xs outline-none" />
                                            <span className="text-slate-600">-</span>
                                            <input type="time" value={jornada[dia].s1} onChange={e=>updateJornada(dia, 's1', e.target.value)} className="bg-transparent text-white text-xs outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                                            <span className="text-[10px] text-slate-500">TARDE</span>
                                            <input type="time" value={jornada[dia].e2} onChange={e=>updateJornada(dia, 'e2', e.target.value)} className="bg-transparent text-white text-xs outline-none" />
                                            <span className="text-slate-600">-</span>
                                            <input type="time" value={jornada[dia].s2} onChange={e=>updateJornada(dia, 's2', e.target.value)} className="bg-transparent text-white text-xs outline-none" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            ))}
                        </div>
                    </div>

                    {/* CONFIGURAÇÃO DE LOCALIZAÇÃO (MAPA + GPS + CAMPOS) */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2"><MapPin size={18}/> Regras de Localização</h4>
                        
                        <label className="flex items-center gap-3 mb-4 cursor-pointer bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <input type="checkbox" checked={pontoLivre} onChange={e=>setPontoLivre(e.target.checked)} className="w-5 h-5 accent-purple-600" />
                            <div>
                                <span className="font-bold block text-sm">Modo Livre (Vendedor Externo)</span>
                                <span className="text-xs text-slate-400">Pode bater ponto em qualquer lugar (Ignora GPS).</span>
                            </div>
                        </label>

                        {!pontoLivre && (
                            <div className="space-y-6">
                                {/* MAPA DE CAPTURA (NOVIDADE) */}
                                <MapaCaptura latInicial={lat} lngInicial={lng} aoSelecionar={aoClicarNoMapa} />

                                {/* SEDE / PRINCIPAL (COM BOTÃO DE GPS) */}
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs font-bold text-slate-300 uppercase">Sede / Principal</p>
                                        <button type="button" onClick={()=>pegarLocalizacaoAtual('PRINCIPAL')} className="flex items-center gap-1 text-blue-400 text-xs hover:underline font-bold">
                                            <MapPin size={12}/> Usar meu GPS atual
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-500 block">Latitude</label>
                                            <input value={lat} onChange={e=>setLat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-400 text-xs"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block">Longitude</label>
                                            <input value={lng} onChange={e=>setLng(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-slate-400 text-xs"/>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 block">Raio (m)</label>
                                            <input type="number" value={raio} onChange={e=>setRaio(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-2 rounded text-white text-xs"/>
                                        </div>
                                    </div>
                                </div>

                                {/* LOCAIS EXTRAS */}
                                <div className="pt-2 border-t border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Locais Adicionais (Obras / Filiais)</p>
                                    
                                    {/* Lista de Extras */}
                                    {locaisExtras.map((loc, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700 mb-2">
                                            <span className="text-xs text-white">{loc.nome} <span className="text-slate-500 text-[10px]">({loc.lat?.substring(0,7)}...)</span></span>
                                            <button type="button" onClick={()=>removeLocalExtra(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                                        </div>
                                    ))}

                                    {/* Formulário Novo Local */}
                                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                        <div className="flex gap-2 mb-2">
                                            <input placeholder="Nome do Local (Ex: Obra A)" value={novoLocal.nome} onChange={e=>setNovoLocal({...novoLocal, nome: e.target.value})} className="flex-1 bg-slate-950 border border-slate-700 p-2 rounded text-white text-xs"/>
                                            <button type="button" onClick={() => setNovoLocal({...novoLocal, lat: lat, lng: lng})} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded text-xs">Copiar do Mapa</button>
                                            <button type="button" onClick={()=>pegarLocalizacaoAtual('EXTRA')} className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded text-xs"><MapPin size={12}/></button>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2">
                                            <input placeholder="Lat" value={novoLocal.lat} onChange={e=>setNovoLocal({...novoLocal, lat: e.target.value})} className="col-span-5 bg-slate-950 border border-slate-700 p-2 rounded text-slate-400 text-xs"/>
                                            <input placeholder="Lng" value={novoLocal.lng} onChange={e=>setNovoLocal({...novoLocal, lng: e.target.value})} className="col-span-5 bg-slate-950 border border-slate-700 p-2 rounded text-slate-400 text-xs"/>
                                            <button type="button" onClick={addLocalExtra} className="col-span-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"><Plus size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 border-dashed hover:border-slate-600 transition-colors">
                        <label className="block text-sm text-slate-300 mb-2 font-bold cursor-pointer">
                            <div className="flex items-center gap-2"><Upload size={18} className="text-purple-400"/> {idEdicao ? 'Trocar Foto' : 'Foto de Rosto (Reconhecimento Facial)'}</div>
                        </label>
                        <input type="file" accept="image/*" onChange={(e) => setFotoArquivo(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-900 file:text-purple-300 hover:file:bg-purple-800 cursor-pointer"/>
                    </div>

                    <div className="pt-2">
                        <button disabled={loading} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${idEdicao ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-green-600 hover:bg-green-700 shadow-green-900/20'}`}>
                            {loading ? 'Salvando...' : <><Save size={20}/> {idEdicao ? 'Atualizar Dados' : 'Cadastrar Funcionário'}</>}
                        </button>
                    </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}