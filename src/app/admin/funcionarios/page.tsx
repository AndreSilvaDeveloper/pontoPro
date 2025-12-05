'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, UserPlus, MapPin, RefreshCw, User, Upload, Clock, Pencil, X } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  latitudeBase: number;
  longitudeBase: number;
  raioPermitido: number;
  fotoPerfilUrl?: string;
  jornada?: any;
}

export default function GestaoFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  
  // Estado para saber se estamos Editando ou Criando
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('100');
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarLista();
  }, []);

  const carregarLista = async () => {
    try {
        const res = await axios.get('/api/admin/funcionarios');
        setFuncionarios(res.data);
    } catch (e) { console.error("Erro ao carregar lista"); }
  };

  // Preenche o formulário com os dados do funcionário para editar
  const iniciarEdicao = (f: Funcionario) => {
    setIdEdicao(f.id);
    setNome(f.nome);
    setEmail(f.email);
    setLat(f.latitudeBase.toString());
    setLng(f.longitudeBase.toString());
    setRaio(f.raioPermitido.toString());
    // Se tiver jornada salva, usa. Se não, usa padrão.
    setJornada(f.jornada || jornadaPadrao);
    setFotoArquivo(null); // Foto reseta (só preenche se quiser trocar)
    
    // Rola a tela para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setIdEdicao(null);
    setNome(''); setEmail(''); setLat(''); setLng(''); setRaio('100');
    setJornada(jornadaPadrao);
    setFotoArquivo(null);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) return alert('Defina a localização!');
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('email', email);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('raio', raio);
      formData.append('jornada', JSON.stringify(jornada)); 
      if (fotoArquivo) formData.append('foto', fotoArquivo);

      if (idEdicao) {
        // MODO EDIÇÃO (PUT)
        formData.append('id', idEdicao);
        await axios.put('/api/admin/funcionarios', formData);
        alert('Funcionário atualizado com sucesso!');
      } else {
        // MODO CRIAÇÃO (POST)
        await axios.post('/api/admin/funcionarios', formData);
        alert('Funcionário cadastrado!');
      }
      
      cancelarEdicao(); // Limpa tudo
      carregarLista();  // Atualiza tabela
    } catch (error) {
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const updateJornada = (dia: string, campo: string, valor: any) => {
    setJornada((prev: any) => ({
        ...prev,
        [dia]: { ...prev[dia], [campo]: valor }
    }));
  };

  const pegarLocalizacaoAtual = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toString());
      setLng(pos.coords.longitude.toString());
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-blue-400">Gestão de Equipe</h1>
          <Link href="/admin" className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft size={20} /> Voltar</Link>
        </div>

        {/* FORMULÁRIO (Muda o título e cor dependendo se está editando) */}
        <div className={`p-6 rounded-xl border ${idEdicao ? 'bg-blue-900/20 border-blue-800' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`font-bold flex items-center gap-2 ${idEdicao ? 'text-blue-400' : 'text-green-400'}`}>
              {idEdicao ? <><Pencil size={20}/> Editando Funcionário</> : <><UserPlus size={20}/> Novo Cadastro</>}
            </h2>
            {idEdicao && (
              <button onClick={cancelarEdicao} className="text-sm text-red-400 flex items-center gap-1 hover:underline">
                <X size={16}/> Cancelar Edição
              </button>
            )}
          </div>
          
          <form onSubmit={salvar} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Nome" className="bg-slate-950 border border-slate-700 p-3 rounded text-white" value={nome} onChange={e => setNome(e.target.value)} required />
              <input placeholder="Email" type="email" className="bg-slate-950 border border-slate-700 p-3 rounded text-white" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-3 font-bold flex items-center gap-2"><Clock size={16}/> Jornada de Trabalho</p>
              <div className="space-y-2">
                {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => (
                  <div key={dia} className="flex flex-col md:flex-row items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                    <div className="w-16 font-bold uppercase text-xs text-slate-500">{dia}</div>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mr-4">
                        <input type="checkbox" checked={jornada[dia]?.ativo} onChange={(e) => updateJornada(dia, 'ativo', e.target.checked)} />
                        Trabalha?
                    </label>
                    {jornada[dia]?.ativo && (
                        <>
                            <div className="flex items-center gap-1">
                                <input type="time" value={jornada[dia].e1} onChange={e=>updateJornada(dia, 'e1', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs w-20" />
                                <span className="text-slate-500">-</span>
                                <input type="time" value={jornada[dia].s1} onChange={e=>updateJornada(dia, 's1', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs w-20" />
                            </div>
                            <div className="flex items-center gap-1">
                                <input type="time" value={jornada[dia].e2} onChange={e=>updateJornada(dia, 'e2', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs w-20" />
                                <span className="text-slate-500">-</span>
                                <input type="time" value={jornada[dia].s2} onChange={e=>updateJornada(dia, 's2', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-xs w-20" />
                            </div>
                        </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                <label className="block text-sm text-slate-400 mb-2 font-bold"><Upload size={16} className="inline mr-2"/> {idEdicao ? 'Trocar Foto (Opcional)' : 'Foto (Opcional)'}</label>
                <input type="file" accept="image/*" onChange={(e) => setFotoArquivo(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-400 file:bg-blue-900 file:text-blue-300 file:rounded-full file:px-4 file:py-2 file:border-0 hover:file:bg-blue-800 cursor-pointer" />
            </div>

            <div className="flex gap-2 items-end bg-slate-950 p-4 rounded border border-slate-700">
               <div className="flex-1"><label className="text-xs text-slate-500">Lat</label><input value={lat} readOnly className="w-full bg-slate-800 p-2 rounded text-slate-400" /></div>
               <div className="flex-1"><label className="text-xs text-slate-500">Lng</label><input value={lng} readOnly className="w-full bg-slate-800 p-2 rounded text-slate-400" /></div>
               <div className="w-24"><label className="text-xs text-slate-500">Raio (m)</label><input type="number" value={raio} onChange={e=>setRaio(e.target.value)} className="w-full bg-slate-800 border border-slate-600 p-2 rounded text-white" /></div>
               <button type="button" onClick={pegarLocalizacaoAtual} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-bold h-[42px] whitespace-nowrap"><MapPin size={16} /> GPS Atual</button>
            </div>

            <button disabled={loading} className={`w-full py-3 rounded-lg font-bold transition-colors ${idEdicao ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {loading ? 'Salvando...' : (idEdicao ? 'Atualizar Funcionário' : 'Cadastrar Funcionário')}
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-slate-400">Equipe Ativa</h3>
          {funcionarios.map(func => (
            <div key={func.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-4">
                {func.fotoPerfilUrl ? (
                  <img src={func.fotoPerfilUrl} alt={func.nome} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                ) : (
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center"><User size={24} className="text-slate-500" /></div>
                )}
                <div>
                  <h3 className="font-bold text-white">{func.nome}</h3>
                  <p className="text-sm text-slate-400">{func.email}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {/* BOTÃO EDITAR */}
                <button 
                    onClick={() => iniciarEdicao(func)}
                    className="p-2 bg-blue-900/50 text-blue-400 hover:bg-blue-900 rounded-lg transition-colors border border-blue-900"
                    title="Editar"
                >
                    <Pencil size={18} />
                </button>

                <button 
                    onClick={async () => {
                        if(confirm('Resetar senha?')) {
                            await axios.post('/api/admin/funcionarios/resetar-senha', { usuarioId: func.id });
                            alert('Senha resetada!');
                        }
                    }}
                    className="p-2 bg-yellow-900/50 text-yellow-500 hover:bg-yellow-900 rounded-lg transition-colors border border-yellow-900"
                    title="Resetar Senha"
                >
                    <RefreshCw size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}