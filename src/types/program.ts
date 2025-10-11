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
  startTime: string;
  endTime: string;
  description: string;
  image: string;
  isLive: boolean;
  actors?: string[];
  duration: number;
}

export const categoryColors: Record<ProgramCategory, string> = {
  'Sport': 'from-green-500 to-emerald-600',
  'Cinéma': 'from-red-500 to-rose-600',
  'Séries': 'from-purple-500 to-violet-600',
  'Actualités': 'from-blue-500 to-cyan-600',
  'Divertissement': 'from-yellow-500 to-orange-600',
  'Documentaires': 'from-teal-500 to-cyan-600',
  'Enfants': 'from-pink-500 to-fuchsia-600',
};
