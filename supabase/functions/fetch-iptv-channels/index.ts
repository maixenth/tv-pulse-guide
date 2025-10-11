import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

// Fetch EPG data from Supabase Storage
async function getEPGFromStorage(): Promise<EPGProgram[]> {
  try {
    console.log('Fetching pre-parsed EPG from Supabase Storage...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Download EPG JSON from storage
    const { data, error } = await supabase.storage
      .from('epg-data')
      .download('epg-programs.json');

    if (error) {
      console.error('Error downloading EPG from storage:', error);
      return [];
    }

    const jsonText = await data.text();
    const epgData = JSON.parse(jsonText);
    
    console.log(`Loaded ${epgData.total_programs} programs from storage (updated: ${epgData.updated_at})`);
    return epgData.programs || [];
  } catch (error) {
    console.error('Error fetching EPG from storage:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching IPTV data from iptv-org API...');
    
    // Fetch channels from iptv-org API
    const channelsResponse = await fetch('https://iptv-org.github.io/api/channels.json');
    
    if (!channelsResponse.ok) {
      throw new Error(`Failed to fetch channels: ${channelsResponse.statusText}`);
    }

    const allChannelsData = await channelsResponse.json();
    console.log(`Fetched ${allChannelsData.length} total channels from iptv-org`);

    // Fetch streams to get URLs
    const streamsResponse = await fetch('https://iptv-org.github.io/api/streams.json');
    const streamsData = streamsResponse.ok ? await streamsResponse.json() : [];
    console.log(`Fetched ${streamsData.length} streams`);

    // Fetch logos
    const logosResponse = await fetch('https://iptv-org.github.io/api/logos.json');
    const logosData = logosResponse.ok ? await logosResponse.json() : [];
    console.log(`Fetched ${logosData.length} logos`);

    // Create a map of channel -> stream URL
    const streamMap = new Map();
    streamsData.forEach((stream: any) => {
      if (stream.channel && stream.url && !streamMap.has(stream.channel)) {
        streamMap.set(stream.channel, stream.url);
      }
    });

    // Create a map of channel -> logo URL
    const logoMap = new Map();
    logosData.forEach((logo: any) => {
      if (logo.channel && logo.url && !logoMap.has(logo.channel)) {
        logoMap.set(logo.channel, logo.url);
      }
    });

    // Filter for francophone, African, and sports channels
    const relevantChannels = allChannelsData
      .filter((channel: any) => {
        const hasRelevantLanguage = channel.languages?.some((lang: string) => 
          ['fra', 'fre', 'ar', 'eng'].includes(lang.toLowerCase())
        );
        
        const hasRelevantCountry = channel.country && [
          'fr', 'be', 'ch', 'ca', 'dz', 'ma', 'tn', 'sn', 'ci', 'cm', 'cd', 
          'bf', 'ml', 'ne', 'tg', 'bj', 'gn', 'rw', 'bi', 'td', 'cf', 'ga',
          'cg', 'mg', 'km', 'sc', 'mu', 'dj', 'za', 'ng', 'ke', 'gh', 'ug',
          'tz', 'et', 'zw', 'zm', 'mw', 'ao', 'mz', 'na', 'bw', 'ls', 'sz'
        ].includes(channel.country.toLowerCase());

        const hasSportsCategory = channel.categories?.some((cat: string) => 
          cat.toLowerCase().includes('sport')
        );

        return (hasRelevantLanguage || hasRelevantCountry || hasSportsCategory) && streamMap.has(channel.id);
      })
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        logo: logoMap.get(channel.id) || 'https://via.placeholder.com/150?text=No+Logo',
        country: channel.country || '',
        categories: channel.categories || [],
        languages: channel.languages || [],
        url: streamMap.get(channel.id) || '',
      }));

    console.log(`Filtered to ${relevantChannels.length} relevant channels with streams`);

    // Fetch EPG data from pre-parsed JSON in Storage
    const programs = await getEPGFromStorage();
    console.log(`Loaded ${programs.length} EPG programs from storage`);

    // Group channels by category
    const categorizedChannels = {
      sports: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('sport'))
      ),
      news: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('news'))
      ),
      entertainment: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => 
          cat.toLowerCase().includes('entertainment') || 
          cat.toLowerCase().includes('general')
        )
      ),
      kids: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('kids'))
      ),
      movies: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('movie'))
      ),
      series: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('series'))
      ),
      documentary: relevantChannels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('documentary'))
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        totalChannels: relevantChannels.length,
        channels: relevantChannels,
        categorized: categorizedChannels,
        programs: programs,
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
