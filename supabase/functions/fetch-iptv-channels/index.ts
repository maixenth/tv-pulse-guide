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

// Parse EPG XML data
function parseEPG(xmlData: string, channels: Channel[]): EPGProgram[] {
  const programs: EPGProgram[] = [];
  const now = new Date();
  
  // Create a map of channel IDs for quick lookup
  const channelMap = new Map<string, string>();
  channels.forEach(ch => {
    channelMap.set(ch.id, ch.name);
    channelMap.set(ch.name.toLowerCase(), ch.name);
  });
  
  try {
    // Simple XML parsing for programme tags
    const programmeRegex = /<programme[^>]*>([\s\S]*?)<\/programme>/g;
    const matches = xmlData.matchAll(programmeRegex);
    
    let count = 0;
    for (const match of matches) {
      const programmeXml = match[0];
      
      // Extract attributes
      const startMatch = programmeXml.match(/start="([^"]+)"/);
      const endMatch = programmeXml.match(/stop="([^"]+)"/);
      const channelMatch = programmeXml.match(/channel="([^"]+)"/);
      
      // Extract title
      const titleMatch = programmeXml.match(/<title[^>]*>([^<]+)<\/title>/);
      
      // Extract description
      const descMatch = programmeXml.match(/<desc[^>]*>([^<]+)<\/desc>/);
      
      // Extract category
      const categoryMatch = programmeXml.match(/<category[^>]*>([^<]+)<\/category>/);
      
      if (startMatch && endMatch && channelMatch && titleMatch) {
        const startTime = parseEPGDate(startMatch[1]);
        const endTime = parseEPGDate(endMatch[1]);
        const isLive = now >= startTime && now <= endTime;
        
        // Only include current and upcoming programs
        if (endTime > now) {
          const channelId = channelMatch[1];
          const channelName = channelMap.get(channelId) || channelMap.get(channelId.toLowerCase()) || channelId;
          
          programs.push({
            id: `${channelId}-${startMatch[1]}`,
            title: titleMatch[1],
            description: descMatch ? descMatch[1] : '',
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            channel: channelName,
            category: categoryMatch ? categoryMatch[1] : 'Général',
            isLive: isLive,
          });
          
          count++;
          if (count >= 2000) break; // Increase limit to 2000 programs
        }
      }
    }
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

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));

    const tzMatch = epgDate.match(/([+-])(\d{2})(\d{2})$/);
    if (tzMatch) {
        const sign = tzMatch[1] === '-' ? -1 : 1;
        const tzHour = parseInt(tzMatch[2]);
        const tzMinute = parseInt(tzMatch[3]);
        const offset = (tzHour * 60 + tzMinute) * 60 * 1000;
        // Adjust the date by subtracting the offset, as we parsed it as UTC
        date.setTime(date.getTime() - (sign * offset));
    }

    return date;
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

    // Fetch EPG data from working sources
    let programs: EPGProgram[] = [];
    try {
      console.log('Fetching EPG data...');
      
      // Use epg.pw as a reliable EPG source for French channels
      const epgSources = [
        'https://iptv-org.github.io/epg/guides/fr/canalplus.fr.epg.xml',
        'https://iptv-org.github.io/epg/guides/fr/sfr.fr.epg.xml',
        'https://iptv-org.github.io/epg/guides/fr/orange.fr.epg.xml',
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

    // Create a map of program channels for efficient lookup
    const programChannelNames = new Set(programs.map(p => p.channel.toLowerCase()));
    console.log(`Unique channel names with EPG data: ${programChannelNames.size}`);

    // Improved filtering: Keep a channel if its name is found in the EPG data
    const filteredChannels = relevantChannels.filter(ch => {
      const channelNameLower = ch.name.toLowerCase();
      // Check if any program channel name includes the channel's name, or vice-versa
      for (const progChannel of programChannelNames) {
        if (progChannel.includes(channelNameLower) || channelNameLower.includes(progChannel)) {
          return true;
        }
      }
      return false;
    });

    console.log(`Filtered to ${filteredChannels.length} channels with EPG (from ${relevantChannels.length} total)`);

    // Further filter programs to only those belonging to the filtered channels
    const finalChannelNames = new Set(filteredChannels.map(ch => ch.name.toLowerCase()));
    const finalPrograms = programs.filter(p => {
        const programChannelLower = p.channel.toLowerCase();
        for (const finalChannel of finalChannelNames) {
            if (programChannelLower.includes(finalChannel) || finalChannel.includes(programChannelLower)) {
                return true;
            }
        }
        return false;
    });

    console.log(`Final program count: ${finalPrograms.length}`);


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
