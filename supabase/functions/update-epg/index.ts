import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts";
import { decompress } from "https://deno.land/x/zip@v1.2.5/mod.ts";

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
    console.log('Starting EPG update process...');
    
    // Initialize Supabase client with service role key for storage write access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch EPG XML ZIP (using TNT France which is much smaller - 0.82 MB)
    console.log('Fetching EPG XML ZIP from xmltvfr.fr (TNT France)...');
    const epgResponse = await fetch('https://xmltvfr.fr/xmltv/xmltv_tnt.zip');
    
    if (!epgResponse.ok) {
      throw new Error(`Failed to fetch EPG: ${epgResponse.status}`);
    }

    // Get ZIP data as ArrayBuffer
    const zipData = await epgResponse.arrayBuffer();
    console.log(`ZIP size: ${zipData.byteLength} bytes`);
    
    // Extract XML from ZIP
    console.log('Extracting XML from ZIP...');
    const zipBytes = new Uint8Array(zipData);
    const tempZipPath = '/tmp/epg.zip';
    const tempExtractPath = '/tmp/extracted';
    
    // Write ZIP file
    await Deno.writeFile(tempZipPath, zipBytes);
    
    // Decompress using deno.land/x/zip
    await decompress(tempZipPath, tempExtractPath);
    
    // Find the XML file in extracted directory
    const files = [];
    for await (const entry of Deno.readDir(tempExtractPath)) {
      if (entry.name.endsWith('.xml')) {
        files.push(entry.name);
      }
    }
    
    if (files.length === 0) {
      throw new Error('No XML file found in ZIP');
    }
    
    const xmlText = await Deno.readTextFile(`${tempExtractPath}/${files[0]}`);
    console.log(`EPG XML size: ${xmlText.length} bytes`);

    // Parse XML to JSON
    console.log('Parsing XML to JSON...');
    const doc: any = parse(xmlText);
    const now = new Date();
    const programs: EPGProgram[] = [];
    
    const tv = doc.tv;
    if (!tv || !tv.programme) {
      throw new Error('No programme data found in XML');
    }
    
    const programmes = Array.isArray(tv.programme) ? tv.programme : [tv.programme];
    console.log(`Found ${programmes.length} programme entries`);
    
    // Process all programs from TNT (no need to limit as file is smaller)
    const channelProgramCount = new Map<string, number>();
    const maxProgramsPerChannel = 10; // More programs per channel for TNT
    
    for (const prog of programmes) {
      const channelId = prog['@channel'];
      if (!channelId) continue;
      
      const channelIdLower = channelId.toLowerCase();
      if ((channelProgramCount.get(channelIdLower) || 0) >= maxProgramsPerChannel) continue;
      
      const startStr = prog['@start'];
      const stopStr = prog['@stop'];
      if (!startStr || !stopStr) continue;
      
      const startTime = parseEPGDate(startStr);
      const endTime = parseEPGDate(stopStr);
      
      // Only keep current and upcoming programs (not past)
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
        isLive: isLive,
      });
      
      channelProgramCount.set(channelIdLower, (channelProgramCount.get(channelIdLower) || 0) + 1);
      
      // Keep more programs for TNT as file is smaller
      if (programs.length >= 10000) break;
    }
    
    console.log(`Parsed ${programs.length} EPG programs`);

    // Convert to JSON
    const epgData = {
      updated_at: new Date().toISOString(),
      total_programs: programs.length,
      programs: programs,
    };
    
    const jsonContent = JSON.stringify(epgData);
    console.log(`JSON size: ${jsonContent.length} bytes`);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('epg-data')
      .upload('epg-programs.json', jsonContent, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('EPG update completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'EPG data updated successfully',
        total_programs: programs.length,
        file_size_bytes: jsonContent.length,
        updated_at: epgData.updated_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating EPG:', error);
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
