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

// Parse EPG date format (YYYYMMDDHHMMSS +TZTZ)
function parseEPGDate(epgDate: string): Date {
  const year = parseInt(epgDate.substring(0, 4));
  const month = parseInt(epgDate.substring(4, 6)) - 1;
  const day = parseInt(epgDate.substring(6, 8));
  const hour = parseInt(epgDate.substring(8, 10));
  const minute = parseInt(epgDate.substring(10, 12));
  const second = parseInt(epgDate.substring(12, 14));
  
  return new Date(year, month, day, hour, minute, second);
}

// Parse EPG XML efficiently - only keep 3 programs per channel max
async function parseEPGFromURL(url: string, channelNames: Set<string>): Promise<EPGProgram[]> {
  const programs: EPGProgram[] = [];
  const now = new Date();
  const channelProgramCount = new Map<string, number>();
  const maxProgramsPerChannel = 3;
  
  try {
    console.log(`Fetching EPG from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to fetch EPG: ${response.status}`);
      return programs;
    }
    
    const xmlText = await response.text();
    console.log(`EPG XML size: ${xmlText.length} bytes`);
    
    // Split by programme tags to avoid regex memory issues
    const chunks = xmlText.split('<programme');
    console.log(`Found ${chunks.length - 1} programme blocks`);
    
    for (let i = 1; i < chunks.length; i++) {
      const chunk = '<programme' + chunks[i].split('</programme>')[0] + '</programme>';
      
      // Extract channel
      const channelMatch = chunk.match(/channel="([^"]+)"/);
      if (!channelMatch) continue;
      
      const channelId = channelMatch[1].toLowerCase();
      
      // Skip if we don't have this channel or already have enough programs for it
      if (!channelNames.has(channelId)) continue;
      if ((channelProgramCount.get(channelId) || 0) >= maxProgramsPerChannel) continue;
      
      // Extract timing
      const startMatch = chunk.match(/start="([^"]+)"/);
      const endMatch = chunk.match(/stop="([^"]+)"/);
      if (!startMatch || !endMatch) continue;
      
      const startTime = parseEPGDate(startMatch[1]);
      const endTime = parseEPGDate(endMatch[1]);
      
      // Only keep programs that are current or upcoming (not past)
      if (endTime < now) continue;
      
      // Extract title
      const titleMatch = chunk.match(/<title[^>]*>([^<]+)<\/title>/);
      if (!titleMatch) continue;
      
      // Extract description
      const descMatch = chunk.match(/<desc[^>]*>([^<]+)<\/desc>/);
      
      // Extract category
      const categoryMatch = chunk.match(/<category[^>]*>([^<]+)<\/category>/);
      
      const isLive = now >= startTime && now <= endTime;
      
      programs.push({
        id: `${channelMatch[1]}-${startMatch[1]}`,
        title: titleMatch[1],
        description: descMatch ? descMatch[1] : '',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        channel: channelMatch[1],
        category: categoryMatch ? categoryMatch[1] : 'Général',
        isLive: isLive,
      });
      
      channelProgramCount.set(channelId, (channelProgramCount.get(channelId) || 0) + 1);
      
      // Stop early if we have enough programs total
      if (programs.length >= 3000) break;
    }
    
    console.log(`Parsed ${programs.length} real EPG programs for ${channelProgramCount.size} channels`);
  } catch (error) {
    console.error('Error parsing EPG:', error);
  }
  
  return programs;
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

    // Create a set of channel IDs and names for EPG lookup
    const channelNamesForEPG = new Set<string>();
    relevantChannels.forEach((ch: Channel) => {
      channelNamesForEPG.add(ch.id.toLowerCase());
      channelNamesForEPG.add(ch.name.toLowerCase());
    });

    // Fetch real EPG data from xmltvfr.fr (TNT only - much smaller file)
    const programs = await parseEPGFromURL(
      'https://xmltvfr.fr/xmltv/tnt.xml',
      channelNamesForEPG
    );
    console.log(`Got ${programs.length} real EPG programs`);

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
