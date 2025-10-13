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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Background task that does the heavy lifting
  async function processEPGData() {
    try {
      console.log('Starting to populate EPG data...');


      // 2. Fetch and parse EPG XML from xmltvfr.fr (TNT France - much smaller file)
      console.log('Fetching EPG XML from xmltvfr.fr (TNT France)...');
      const epgResponse = await fetch('https://xmltvfr.fr/xmltv/xmltv_tnt.xml.gz');
      if (!epgResponse.ok) {
        throw new Error(`Failed to fetch EPG: ${epgResponse.statusText}`);
      }

      const gzData = await epgResponse.arrayBuffer();
      console.log(`Downloaded ${(gzData.byteLength / 1024).toFixed(2)} KB`);

      const decompressedStream = new Response(
        new Blob([gzData]).stream().pipeThrough(new DecompressionStream('gzip'))
      );
      const xmlText = await decompressedStream.text();
      console.log(`Decompressed to ${(xmlText.length / 1024).toFixed(2)} KB`);

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
      const channelProgramCount = new Map<string, number>();
      const maxProgramsPerChannel = 20; // More programs per channel for TNT

      console.log(`Found ${programElements.length} programme entries from TNT France...`);

      for (const prog of programElements) {
        const channelId = prog['@channel'];
        if (!channelId) continue;

        const currentCount = channelProgramCount.get(channelId) || 0;
        if (currentCount >= maxProgramsPerChannel) continue;

        const startStr = prog['@start'];
        const stopStr = prog['@stop'];
        if (!startStr || !stopStr) continue;

        const startTime = parseEPGDate(startStr);
        const endTime = parseEPGDate(stopStr);

        // Only keep current and upcoming programs (not past)
        if (endTime < now) continue;

        const titleNode = prog.title;
        const title = typeof titleNode === 'object' ? titleNode['#text'] : titleNode;
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

        channelProgramCount.set(channelId, currentCount + 1);
      }

      console.log(`Parsed ${programs.length} programs total`);

      // Delete ALL existing programs first (including demo data)
      console.log('Deleting all existing programs...');
      const { error: deleteError } = await supabase
        .from('programs')
        .delete()
        .neq('id', 'impossible-id-that-does-not-exist');

      if (deleteError) {
        console.error('Error deleting programs:', deleteError);
      }

      // Insert programs in smaller batches
      console.log('Inserting programs into database...');
      const batchSize = 250;
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

      console.log('EPG data populated successfully from xmltvfr.fr');
    } catch (error) {
      console.error('Background task error:', error);
    }
  }

  // Start the background task
  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  globalThis.EdgeRuntime?.waitUntil(processEPGData());

  // Return immediately
  return new Response(
    JSON.stringify({
      success: true,
      message: 'EPG update started in background',
      status: 'processing'
    }),
    {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
