import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  country: string;
  categories: string[];
  languages: string[];
  url: string;
}

interface EPGProgram {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  channel: string;
  category: string;
  image?: string;
  isLive: boolean;
}

interface IPTVResponse {
  success: boolean;
  totalChannels: number;
  channels: IPTVChannel[];
  programs: EPGProgram[];
  categorized: {
    sports: IPTVChannel[];
    news: IPTVChannel[];
    entertainment: IPTVChannel[];
    kids: IPTVChannel[];
    movies: IPTVChannel[];
    series: IPTVChannel[];
    documentary: IPTVChannel[];
  };
}

export const useIPTVChannels = () => {
  return useQuery({
    queryKey: ['iptv-channels', new Date().toISOString().split('T')[0]], // Change key daily to force refresh
    queryFn: async () => {
      console.log('Fetching IPTV channels from edge function...');
      
      const { data, error } = await supabase.functions.invoke<IPTVResponse>('fetch-iptv-channels');

      if (error) {
        console.error('Error invoking edge function:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error('Failed to fetch IPTV channels');
      }

      console.log(`Loaded ${data.totalChannels} channels`);
      console.log('First 3 channel logos:', data.channels.slice(0, 3).map(c => ({ name: c.name, logo: c.logo })));
      return data;
    },
    staleTime: 0, // Disable cache for testing
    gcTime: 0, // Don't cache at all (replaces cacheTime in newer versions)
    retry: 2,
  });
};
