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
  tipo: 'PONTO' | 'AUSENCIA';
  subTipo: string;
  descricao: string;
  usuario: RegistroUsuario;
  extra: {
    fotoUrl?: string | null;
    comprovanteUrl?: string | null;
    dataFim?: string | null;
  };
}
