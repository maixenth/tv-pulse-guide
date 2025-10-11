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

const CACHE_KEY = 'epg-cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function useEPGParser() {
  const [programs, setPrograms] = useState<EPGProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEPG();
  }, []);

  const loadEPG = async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('Using cached EPG data');
          setPrograms(data);
          setIsLoading(false);
          return;
        }
      }

      console.log('Fetching EPG via edge function...');
      setIsLoading(true);

      // Call edge function to download and parse EPG
      const { data, error } = await supabase.functions.invoke('fetch-epg');

      if (error) throw error;
      if (!data || !data.programs) throw new Error('No EPG data returned');

      const parsedPrograms = data.programs;
      console.log(`Loaded ${parsedPrograms.length} programs from edge function`);


      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: parsedPrograms,
        timestamp: Date.now(),
      }));

      setPrograms(parsedPrograms);
      setError(null);
    } catch (err) {
      console.error('EPG parsing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load EPG');
    } finally {
      setIsLoading(false);
    }
  };

  return { programs, isLoading, error, reload: loadEPG };
}
