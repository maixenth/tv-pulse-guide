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

interface IPTVResponse {
  success: boolean;
  totalChannels: number;
  channels: IPTVChannel[];
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
    queryKey: ['iptv-channels'],
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
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });
};
