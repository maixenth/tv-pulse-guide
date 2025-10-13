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

<<<<<<< HEAD
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
=======
>>>>>>> 28f7540cea0c6752b27c4597b1f1c0e7b07dc221

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching M3U playlist from epg.best...');
    
    // Fetch M3U playlist
    const m3uResponse = await fetch('https://epg.best/48b22-gtcznu.m3u');
    
    if (!m3uResponse.ok) {
      throw new Error(`Failed to fetch M3U: ${m3uResponse.statusText}`);
    }

    const m3uText = await m3uResponse.text();
    console.log(`Downloaded M3U: ${(m3uText.length / 1024).toFixed(2)} KB`);

    // Parse M3U format
    const lines = m3uText.split('\n');
    const channels: Channel[] = [];
    let currentChannel: Partial<Channel> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse #EXTINF line
      if (line.startsWith('#EXTINF:')) {
        const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
        
        // Extract channel name (after last comma)
        const nameMatch = line.split(',').pop();
        
        currentChannel = {
          id: tvgIdMatch?.[1] || `ch-${channels.length}`,
          name: nameMatch?.trim() || tvgNameMatch?.[1] || 'Unknown',
          logo: tvgLogoMatch?.[1] || 'https://via.placeholder.com/150?text=No+Logo',
          country: '',
          categories: groupTitleMatch?.[1] ? [groupTitleMatch[1]] : [],
          languages: ['fra'],
          url: '',
        };
      }
      // Parse URL line
      else if (line && !line.startsWith('#') && currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = null;
      }
    }

<<<<<<< HEAD
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

=======
    console.log(`Parsed ${channels.length} channels from M3U`);
>>>>>>> 28f7540cea0c6752b27c4597b1f1c0e7b07dc221

    // Group channels by category
    const categorizedChannels = {
      sports: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('sport'))
      ),
      news: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('news') || cat.toLowerCase().includes('actualit'))
      ),
      entertainment: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => 
          cat.toLowerCase().includes('entertainment') || 
          cat.toLowerCase().includes('general') ||
          cat.toLowerCase().includes('divertissement')
        )
      ),
      kids: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('kids') || cat.toLowerCase().includes('enfant'))
      ),
      movies: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('movie') || cat.toLowerCase().includes('cinéma') || cat.toLowerCase().includes('film'))
      ),
      series: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('series') || cat.toLowerCase().includes('série'))
      ),
      documentary: channels.filter((ch: Channel) => 
        ch.categories?.some(cat => cat.toLowerCase().includes('documentary') || cat.toLowerCase().includes('documentaire'))
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        totalChannels: channels.length,
        channels: channels,
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
