import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

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
  start_time: string;
  end_time: string;
  channel_id: string;
  category: string;
  is_live: boolean;
}

// Parse EPG date format
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting to populate EPG data...');

    // 1. Fetch and parse M3U for channels
    console.log('Fetching M3U playlist...');
    const m3uResponse = await fetch('https://epg.best/48b22-gtcznu.m3u');
    if (!m3uResponse.ok) {
      throw new Error(`Failed to fetch M3U: ${m3uResponse.statusText}`);
    }

    const m3uText = await m3uResponse.text();
    const lines = m3uText.split('\n');
    const allChannels: Channel[] = [];
    let currentChannel: Partial<Channel> | null = null;

    // Parse M3U
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
        const nameMatch = line.split(',').pop();
        
        currentChannel = {
          id: tvgIdMatch?.[1] || `ch-${allChannels.length}`,
          name: nameMatch?.trim() || tvgNameMatch?.[1] || 'Unknown',
          logo: tvgLogoMatch?.[1] || 'https://via.placeholder.com/150?text=No+Logo',
          country: '',
          categories: groupTitleMatch?.[1] ? [groupTitleMatch[1]] : [],
          languages: ['fra'],
          url: '',
        };
      } else if (line && !line.startsWith('#') && currentChannel) {
        currentChannel.url = line;
        allChannels.push(currentChannel as Channel);
        currentChannel = null;
      }
    }

    console.log(`Parsed ${allChannels.length} total channels`);

    // Filter for French channels only to reduce load
    const channels = allChannels.filter(ch => {
      const nameLower = ch.name.toLowerCase();
      const categoryLower = ch.categories.join(' ').toLowerCase();
      
      // Keep French, Belgian, Swiss, African francophone channels
      return (
        nameLower.includes('fr') || 
        nameLower.includes('france') ||
        nameLower.includes('tf1') ||
        nameLower.includes('m6') ||
        nameLower.includes('arte') ||
        nameLower.includes('canal') ||
        categoryLower.includes('french') ||
        categoryLower.includes('france') ||
        categoryLower.includes('français')
      );
    }).slice(0, 500); // Limit to 500 channels max

    console.log(`Filtered to ${channels.length} French channels`);

    // Insert channels into database
    console.log('Inserting channels into database...');
    const { error: channelError } = await supabase
      .from('channels')
      .upsert(channels, { onConflict: 'id' });

    if (channelError) {
      console.error('Error inserting channels:', channelError);
      throw channelError;
    }

    console.log('Channels inserted successfully');

    // Generate demo programs for testing (waiting for epg.best authorization)
    console.log('Generating demo EPG programs...');
    
    const now = new Date();
    const programs: EPGProgram[] = [];
    
    const demoPrograms = [
      { title: "Journal télévisé", category: "Actualités", duration: 30 },
      { title: "Magazine sportif", category: "Sport", duration: 60 },
      { title: "Film du soir", category: "Cinéma", duration: 120 },
      { title: "Série policière", category: "Séries", duration: 50 },
      { title: "Documentaire nature", category: "Documentaires", duration: 52 },
      { title: "Dessins animés", category: "Enfants", duration: 25 },
      { title: "Divertissement", category: "Divertissement", duration: 90 },
      { title: "Météo", category: "Actualités", duration: 5 },
      { title: "Émission culturelle", category: "Documentaires", duration: 45 },
      { title: "Match en direct", category: "Sport", duration: 110 },
    ];

    // Generate 5 programs per channel over 12 hours
    for (const channel of channels.slice(0, 100)) { // First 100 channels only
      let startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // Start 2h ago
      
      for (let i = 0; i < 5; i++) {
        const demoProgram = demoPrograms[Math.floor(Math.random() * demoPrograms.length)];
        const endTime = new Date(startTime.getTime() + demoProgram.duration * 60 * 1000);
        const isLive = now >= startTime && now <= endTime;
        
        programs.push({
          id: `${channel.id}-${startTime.getTime()}`,
          title: demoProgram.title,
          description: `Programme de démonstration en attendant l'accès à epg.best`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          channel_id: channel.id,
          category: demoProgram.category,
          is_live: isLive,
        });
        
        startTime = endTime;
      }
    }

    console.log(`Generated ${programs.length} demo programs`);

    // Delete old programs
    const { error: deleteError } = await supabase
      .from('programs')
      .delete()
      .lt('end_time', new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString());

    if (deleteError) {
      console.error('Error deleting old programs:', deleteError);
    }

    // Insert demo programs
    console.log('Inserting demo programs...');
    const batchSize = 100;
    for (let i = 0; i < programs.length; i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      const { error: programError } = await supabase
        .from('programs')
        .upsert(batch, { onConflict: 'id' });

      if (programError) {
        console.error(`Error inserting batch:`, programError);
        throw programError;
      }
    }

    console.log('Demo EPG data populated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        channelsCount: channels.length,
        programsCount: programs.length,
        mode: 'demo',
        note: 'Programmes de démonstration - En attente de l\'autorisation epg.best',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error populating EPG data:', error);
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
