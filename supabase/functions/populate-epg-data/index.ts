import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified interfaces for DB insertion
interface DbChannel {
  id: string;
  name: string;
  logo?: string;
  country: string;
}

interface DbProgram {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  channel_id: string;
  category: string;
  is_live: boolean;
}

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
        date.setTime(date.getTime() - (sign * offset));
    }
    return date;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  async function processEPGData() {
    try {
      console.log('Starting full data refresh from iptv-org...');

      // 1. Fetch channels from iptv-org API
      console.log('Fetching channels from iptv-org...');
      const channelsResponse = await fetch('https://iptv-org.github.io/api/channels.json');
      if (!channelsResponse.ok) throw new Error('Failed to fetch channels');
      const allApiChannels = await channelsResponse.json();

      // Filter for French language channels for relevance
      const frChannels = allApiChannels.filter((c: any) => 
        c.languages?.some((l: any) => l.code === 'fra')
      );
      console.log(`Found ${frChannels.length} French channels.`);

      const dbChannels: DbChannel[] = frChannels.map((c: any) => ({
        id: c.id,
        name: c.name,
        logo: c.logo,
        country: c.country.code,
      }));

      // 2. Fetch programs from a comprehensive EPG source
      console.log('Fetching EPG data from iptv-org...');
      const epgResponse = await fetch('https://iptv-org.github.io/epg/epg.xml.gz');
      if (!epgResponse.ok) throw new Error('Failed to fetch EPG data');
      
      const gzData = await epgResponse.arrayBuffer();
      const decompressedStream = new Response(new Blob([gzData]).stream().pipeThrough(new DecompressionStream('gzip')));
      const xmlText = await decompressedStream.text();
      console.log(`Decompressed EPG XML: ${(xmlText.length / 1024 / 1024).toFixed(2)} MB`);

      const xmlDoc: any = parse(xmlText);
      if (!xmlDoc.tv || !xmlDoc.tv.programme) throw new Error('No programme data in EPG XML');

      const programElements = Array.isArray(xmlDoc.tv.programme) ? xmlDoc.tv.programme : [xmlDoc.tv.programme];
      const now = new Date();
      const dbPrograms: DbProgram[] = [];
      const channelSet = new Set(dbChannels.map(c => c.id));

      console.log(`Parsing ${programElements.length} program entries...`);
      for (const prog of programElements) {
        const channelId = prog['@channel'];
        if (!channelId || !channelSet.has(channelId)) continue; // Only keep programs for our selected channels

        const startTime = parseEPGDate(prog['@start']);
        const endTime = parseEPGDate(prog['@stop']);

        if (endTime < now) continue; // Skip past programs

        const titleNode = prog.title;
        const title = typeof titleNode === 'object' ? titleNode['#text'] : titleNode;
        if (!title) continue;

        dbPrograms.push({
          id: `${channelId}-${prog['@start']}`,
          title: String(title),
          description: String(prog.desc?.['#text'] || prog.desc || ''),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          channel_id: channelId,
          category: String(prog.category?.['#text'] || prog.category || 'Général'),
          is_live: now >= startTime && now <= endTime,
        });
      }
      console.log(`Found ${dbPrograms.length} relevant programs.`);

      // 3. Clear and repopulate database
      console.log('Deleting old data...');
      await supabase.from('programs').delete().neq('id', 'dummy');
      await supabase.from('channels').delete().neq('id', 'dummy');

      console.log('Inserting new channels...');
      const { error: channelError } = await supabase.from('channels').upsert(dbChannels);
      if (channelError) throw channelError;

      console.log('Inserting new programs...');
      const batchSize = 500;
      for (let i = 0; i < dbPrograms.length; i += batchSize) {
        const batch = dbPrograms.slice(i, i + batchSize);
        const { error: programError } = await supabase.from('programs').upsert(batch);
        if (programError) throw programError;
        console.log(`Inserted program batch ${i / batchSize + 1}`);
      }

      console.log('Data refresh complete!');

    } catch (error) {
      console.error('Background task error:', error);
    }
  }

  globalThis.EdgeRuntime?.waitUntil(processEPGData());

  return new Response(
    JSON.stringify({ success: true, message: 'Full data refresh started in background.' }),
    { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
