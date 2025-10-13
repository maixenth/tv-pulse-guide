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

export const useIPTVChannels = () => {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      console.log('Fetching channels from Supabase...');
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }

      console.log(`Loaded ${data.length} channels`);
      
      // Group channels by category
      const categorized = {
        sports: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('sport'))
        ),
        news: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('news') || cat.toLowerCase().includes('actualit'))
        ),
        entertainment: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => 
            cat.toLowerCase().includes('entertainment') || 
            cat.toLowerCase().includes('general') ||
            cat.toLowerCase().includes('divertissement')
          )
        ),
        kids: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('kids') || cat.toLowerCase().includes('enfant'))
        ),
        movies: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('movie') || cat.toLowerCase().includes('cinéma') || cat.toLowerCase().includes('film'))
        ),
        series: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('series') || cat.toLowerCase().includes('série'))
        ),
        documentary: data.filter((ch: IPTVChannel) => 
          ch.categories?.some(cat => cat.toLowerCase().includes('documentary') || cat.toLowerCase().includes('documentaire'))
        ),
      };

      return {
        success: true,
        totalChannels: data.length,
        channels: data,
        categorized,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
  });
};
