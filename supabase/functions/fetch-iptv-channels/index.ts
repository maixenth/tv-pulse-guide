import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Channel {
  id: string;
  name: string;
  logo: string;
  country: string;
  categories: string[];
  languages: string[];
  url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching IPTV channels from iptv-org API...');
    
    // Fetch channels from iptv-org API
    const response = await fetch('https://iptv-org.github.io/api/channels.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }

    const allChannels: Channel[] = await response.json();
    console.log(`Fetched ${allChannels.length} total channels`);

    // Filter for francophone, African, and sports channels
    const relevantChannels = allChannels.filter(channel => {
      const hasRelevantLanguage = channel.languages?.some(lang => 
        ['fra', 'fre', 'ar', 'eng'].includes(lang.toLowerCase())
      );
      
      const hasRelevantCountry = channel.country && [
        'fr', 'be', 'ch', 'ca', 'dz', 'ma', 'tn', 'sn', 'ci', 'cm', 'cd', 
        'bf', 'ml', 'ne', 'tg', 'bj', 'gn', 'rw', 'bi', 'td', 'cf', 'ga',
        'cg', 'mg', 'km', 'sc', 'mu', 'dj', 'za', 'ng', 'ke', 'gh', 'ug',
        'tz', 'et', 'zw', 'zm', 'mw', 'ao', 'mz', 'na', 'bw', 'ls', 'sz'
      ].includes(channel.country.toLowerCase());

      const hasSportsCategory = channel.categories?.some(cat => 
        cat.toLowerCase().includes('sport')
      );

      const isBeINorSupersport = channel.name?.toLowerCase().includes('bein') || 
                                 channel.name?.toLowerCase().includes('supersport');

      return hasRelevantLanguage || hasRelevantCountry || hasSportsCategory || isBeINorSupersport;
    });

    console.log(`Filtered to ${relevantChannels.length} relevant channels`);

    // Group channels by category
    const categorizedChannels = {
      sports: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('sport'))
      ),
      news: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('news'))
      ),
      entertainment: relevantChannels.filter(ch => 
        ch.categories?.some(cat => 
          cat.toLowerCase().includes('entertainment') || 
          cat.toLowerCase().includes('general')
        )
      ),
      kids: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('kids'))
      ),
      movies: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('movie'))
      ),
      series: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('series'))
      ),
      documentary: relevantChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('documentary'))
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        totalChannels: relevantChannels.length,
        channels: relevantChannels,
        categorized: categorizedChannels,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching IPTV channels:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
