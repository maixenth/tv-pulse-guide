export type ProgramCategory = 
  | 'Sport' 
  | 'Cinéma' 
  | 'Séries' 
  | 'Actualités' 
  | 'Divertissement' 
  | 'Documentaires' 
  | 'Enfants';

export interface Program {
  id: string;
  title: string;
  channel: string;
  category: ProgramCategory;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  image: string;
  isLive: boolean;
  actors?: string[];
  duration: number;
}

export const categoryBgColors: Record<ProgramCategory, string> = {
  'Sport': 'bg-green-600',
  'Cinéma': 'bg-red-600',
  'Séries': 'bg-purple-600',
  'Actualités': 'bg-blue-600',
  'Divertissement': 'bg-slate-600',
  'Documentaires': 'bg-teal-600',
  'Enfants': 'bg-pink-600',
};

export const categoryGradientColors: Record<ProgramCategory, string> = {
  'Sport': 'from-green-500 to-emerald-600',
  'Cinéma': 'from-red-500 to-rose-600',
  'Séries': 'from-purple-500 to-violet-600',
  'Actualités': 'from-blue-500 to-cyan-600',
  'Divertissement': 'from-slate-500 to-slate-700',
  'Documentaires': 'from-teal-500 to-cyan-600',
  'Enfants': 'from-pink-500 to-fuchsia-600',
};
