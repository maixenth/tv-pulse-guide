import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EPGProgram {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  channel: string;
  category: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching EPG XML.GZ from xmltvfr.fr...');
    
    // Download gzipped XML
    const response = await fetch('https://xmltvfr.fr/xmltv/xmltv_tnt.xml.gz');
    if (!response.ok) {
      throw new Error(`Failed to download EPG: ${response.status}`);
    }

    const gzData = await response.arrayBuffer();
    console.log(`Downloaded ${(gzData.byteLength / 1024).toFixed(2)} KB`);

    // Decompress using DecompressionStream
    const decompressedStream = new Response(
      new Blob([gzData]).stream().pipeThrough(new DecompressionStream('gzip'))
    );
    const xmlText = await decompressedStream.text();
    console.log(`Decompressed to ${(xmlText.length / 1024).toFixed(2)} KB`);

    // Parse XML
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
    const maxProgramsPerChannel = 10;

    console.log(`Found ${programElements.length} programme entries`);

    for (const prog of programElements) {
      const channelId = prog['@channel'];
      if (!channelId) continue;

      const channelIdLower = channelId.toLowerCase();
      if ((channelProgramCount.get(channelIdLower) || 0) >= maxProgramsPerChannel) continue;

      const startStr = prog['@start'];
      const stopStr = prog['@stop'];
      if (!startStr || !stopStr) continue;

      const startTime = parseEPGDate(startStr);
      const endTime = parseEPGDate(stopStr);

      // Only keep current and upcoming programs
      if (endTime < now) continue;

      const title = prog.title?.['#text'] || prog.title;
      if (!title) continue;

      const description = prog.desc?.['#text'] || prog.desc || '';
      const category = prog.category?.['#text'] || prog.category || 'Général';
      const isLive = now >= startTime && now <= endTime;

      programs.push({
        id: `${channelId}-${startStr}`,
        title: String(title),
        description: String(description),
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        channel: channelId,
        category: String(category),
        isLive,
      });

      channelProgramCount.set(channelIdLower, (channelProgramCount.get(channelIdLower) || 0) + 1);

      // Limit to avoid timeout
      if (programs.length >= 2000) break;
    }

    console.log(`Parsed ${programs.length} programs`);

    return new Response(
      JSON.stringify({
        success: true,
        programs,
        total: programs.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching EPG:', error);
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

