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
    const channels: Channel[] = [];
    let currentChannel: Partial<Channel> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupTitleMatch = line.match(/group-title="([^"]+)"/);
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
      } else if (line && !line.startsWith('#') && currentChannel) {
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = null;
      }
    }

    console.log(`Parsed ${channels.length} channels`);

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

    // 2. Fetch and parse EPG XML
    console.log('Fetching EPG XML...');
    const epgResponse = await fetch('https://epg.best/260a6-gtcznu.xml.gz');
    if (!epgResponse.ok) {
      throw new Error(`Failed to fetch EPG: ${epgResponse.statusText}`);
    }

    const gzData = await epgResponse.arrayBuffer();
    console.log(`Downloaded ${(gzData.byteLength / 1024 / 1024).toFixed(2)} MB`);

    const decompressedStream = new Response(
      new Blob([gzData]).stream().pipeThrough(new DecompressionStream('gzip'))
    );
    const xmlText = await decompressedStream.text();
    console.log(`Decompressed to ${(xmlText.length / 1024 / 1024).toFixed(2)} MB`);

    console.log('Parsing XML...');
    const xmlDoc: any = parse(xmlText);
    
    if (!xmlDoc.tv || !xmlDoc.tv.programme) {
      throw new Error('No programme data found in XML');
    }
    
    const programElements = Array.isArray(xmlDoc.tv.programme) 
      ? xmlDoc.tv.programme 
      : [xmlDoc.tv.programme];
    
    const now = new Date();
    const programs: EPGProgram[] = [];

    console.log(`Found ${programElements.length} programme entries, parsing...`);

    for (const prog of programElements) {
      const channelId = prog['@channel'];
      if (!channelId) continue;

      const startStr = prog['@start'];
      const stopStr = prog['@stop'];
      if (!startStr || !stopStr) continue;

      const startTime = parseEPGDate(startStr);
      const endTime = parseEPGDate(stopStr);

      // Only keep current and future programs (last 12h to next 7 days)
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (endTime < twelveHoursAgo || startTime > sevenDaysLater) continue;

      const title = prog.title?.['#text'] || prog.title;
      if (!title) continue;

      const description = prog.desc?.['#text'] || prog.desc || '';
      const category = prog.category?.['#text'] || prog.category || 'Général';
      const isLive = now >= startTime && now <= endTime;

      programs.push({
        id: `${channelId}-${startStr}`,
        title: String(title),
        description: String(description),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        channel_id: channelId,
        category: String(category),
        is_live: isLive,
      });

      if (programs.length % 1000 === 0) {
        console.log(`Parsed ${programs.length} programs...`);
      }
    }

    console.log(`Parsed ${programs.length} programs total`);

    // Delete old programs first
    console.log('Deleting old programs...');
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const { error: deleteError } = await supabase
      .from('programs')
      .delete()
      .lt('end_time', twelveHoursAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old programs:', deleteError);
    }

    // Insert programs in batches
    console.log('Inserting programs into database...');
    const batchSize = 500;
    for (let i = 0; i < programs.length; i += batchSize) {
      const batch = programs.slice(i, i + batchSize);
      const { error: programError } = await supabase
        .from('programs')
        .upsert(batch, { onConflict: 'id' });

      if (programError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, programError);
        throw programError;
      }

      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(programs.length / batchSize)}`);
    }

    console.log('EPG data populated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        channelsCount: channels.length,
        programsCount: programs.length,
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
