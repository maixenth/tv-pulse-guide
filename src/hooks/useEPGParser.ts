import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EPGProgram {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  channel: string;
  category: string;
  isLive: boolean;
}

export function useEPGParser() {
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEPG();
  }, []);

  const loadEPG = async () => {
    try {
      console.log('Fetching programs from Supabase...');
      setIsLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('start_time');

      if (error) throw error;

      const parsedPrograms = data.map((prog: any) => ({
        id: prog.id,
        title: prog.title,
        description: prog.description || '',
        start: prog.start_time,
        end: prog.end_time,
        channel: prog.channel_id,
        category: prog.category,
        isLive: prog.is_live,
      }));

      console.log(`Loaded ${parsedPrograms.length} programs from database`);
      setPrograms(parsedPrograms);
      setError(null);
    } catch (err) {
      console.error('EPG loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load EPG');
    } finally {
      setIsLoading(false);
    }
  };

  return { programs, isLoading, error, reload: loadEPG };
}
