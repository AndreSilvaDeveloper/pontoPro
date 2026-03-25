export interface RegistroUsuario {
  id: string;
  nome: string;
  email: string;
  fotoPerfilUrl?: string | null;
  jornada?: any;
}

export interface RegistroUnificado {
  id: string;
  dataHora: string;
  tipo: 'PONTO' | 'AUSENCIA' | 'AJUSTE_BANCO';
  subTipo: string;
  descricao: string;
  usuario: RegistroUsuario;
  extra: {
    fotoUrl?: string | null;
    comprovanteUrl?: string | null;
    dataFim?: string | null;
    minutos?: number;
    adminNome?: string;
    ajusteId?: string;
    dataRef?: string;
    dataFolga?: string;
  };
}
