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

    console.log(`Parsed ${channels.length} channels from M3U`);

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
