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

export const categoryColors: Record<ProgramCategory, string> = {
  'Sport': 'bg-green-600',
  'Cinéma': 'bg-red-600',
  'Séries': 'bg-purple-600',
  'Actualités': 'bg-blue-600',
  'Divertissement': 'bg-slate-600',
  'Documentaires': 'bg-teal-600',
  'Enfants': 'bg-pink-600',
};
