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

// Parse EPG XML data efficiently - only for selected channels
function parseEPG(xmlData: string, channels: Channel[]): EPGProgram[] {
  const programs: EPGProgram[] = [];
  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  // Create a set of channel names we're interested in (for fast lookup)
  const relevantChannelNames = new Set<string>();
  channels.forEach(ch => {
    relevantChannelNames.add(ch.name.toLowerCase());
    relevantChannelNames.add(ch.id.toLowerCase());
  });
  
  console.log(`Looking for programs for ${relevantChannelNames.size} channels`);
  
  try {
    // Split into programme blocks to avoid loading everything at once
    const chunks = xmlData.split('<programme');
    let processed = 0;
    
    for (let i = 1; i < chunks.length && programs.length < 1000; i++) {
      const chunk = '<programme' + chunks[i];
      
      // Quick check if this program is for a channel we care about
      const channelMatch = chunk.match(/channel="([^"]+)"/);
      if (!channelMatch) continue;
      
      const channelId = channelMatch[1].toLowerCase();
      
      // Skip if not a channel we're interested in
      if (!relevantChannelNames.has(channelId)) continue;
      
      // Extract timing
      const startMatch = chunk.match(/start="([^"]+)"/);
      const endMatch = chunk.match(/stop="([^"]+)"/);
      if (!startMatch || !endMatch) continue;
      
      const startTime = parseEPGDate(startMatch[1]);
      const endTime = parseEPGDate(endMatch[1]);
      
      // Only next 48 hours
      if (endTime < now || startTime > next48Hours) continue;
      
      // Extract title
      const titleMatch = chunk.match(/<title[^>]*>([^<]+)<\/title>/);
      if (!titleMatch) continue;
      
      // Find the actual channel name
      let channelName = channelMatch[1];
      for (const ch of channels) {
        if (ch.id.toLowerCase() === channelId || ch.name.toLowerCase() === channelId) {
          channelName = ch.name;
          break;
        }
      }
      
      const isLive = now >= startTime && now <= endTime;
      
      // Extract description
      const descMatch = chunk.match(/<desc[^>]*>([^<]+)<\/desc>/);
      
      // Extract category
      const categoryMatch = chunk.match(/<category[^>]*>([^<]+)<\/category>/);
      
      programs.push({
        id: `${channelMatch[1]}-${startMatch[1]}`,
        title: titleMatch[1],
        description: descMatch ? descMatch[1] : '',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        channel: channelName,
        category: categoryMatch ? categoryMatch[1] : 'Général',
        isLive: isLive,
      });
      
      processed++;
    }
    
    console.log(`Processed ${processed} programme blocks, found ${programs.length} matching programs`);
  } catch (error) {
    console.error('Error parsing EPG:', error);
  }
  
  return programs;
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

    // Fetch EPG data from reliable source
    let programs: EPGProgram[] = [];
    try {
      console.log('Fetching EPG data from xmltvfr.fr (full version for African & French channels)...');
      
      // Use full EPG but with optimized parsing for African/French channels only
      const epgSources = [
        'https://xmltvfr.fr/xmltv/xmltv.xml',
      ];
      
      for (const epgUrl of epgSources) {
        try {
          console.log(`Trying EPG source: ${epgUrl}`);
          const epgResponse = await fetch(epgUrl);
          if (epgResponse.ok) {
            const epgXml = await epgResponse.text();
            console.log(`EPG XML size from ${epgUrl}: ${epgXml.length} bytes`);
            const newPrograms = parseEPG(epgXml, relevantChannels);
            programs.push(...newPrograms);
            console.log(`Parsed ${newPrograms.length} programs from ${epgUrl}`);
          } else {
            console.warn(`EPG fetch failed with status: ${epgResponse.status} for ${epgUrl}`);
          }
        } catch (sourceError) {
          console.warn(`Failed to fetch ${epgUrl}:`, sourceError);
        }
      }
      
      console.log(`Total EPG programs parsed: ${programs.length}`);
    } catch (epgError) {
      console.error('Error fetching EPG data:', epgError);
    }

    // ONLY keep channels that have EPG programs
    const channelsWithPrograms = new Set(programs.map(p => p.channel));
    console.log(`Channels with EPG data: ${channelsWithPrograms.size}`);
    
    const filteredChannels = relevantChannels.filter(ch => 
      channelsWithPrograms.has(ch.name) || channelsWithPrograms.has(ch.id)
    );
    
    console.log(`Filtered to ${filteredChannels.length} channels with EPG (from ${relevantChannels.length} total)`);


    // Group channels by category
    const categorizedChannels = {
      sports: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('sport'))
      ),
      news: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('news'))
      ),
      entertainment: filteredChannels.filter(ch => 
        ch.categories?.some(cat => 
          cat.toLowerCase().includes('entertainment') || 
          cat.toLowerCase().includes('general')
        )
      ),
      kids: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('kids'))
      ),
      movies: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('movie'))
      ),
      series: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('series'))
      ),
      documentary: filteredChannels.filter(ch => 
        ch.categories?.some(cat => cat.toLowerCase().includes('documentary'))
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        totalChannels: filteredChannels.length,
        channels: filteredChannels,
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
