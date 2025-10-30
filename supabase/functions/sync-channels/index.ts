import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IPTVChannel {
  id: string;
  name: string;
  country: string;
  logo: string;
  categories: string[];
  languages: string[];
  stream_url: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting channel synchronization...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch channels from IPTV-ORG API
    console.log('📡 Fetching channels from IPTV-ORG...');
    const response = await fetch('https://iptv-org.github.io/api/channels.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }

    const allChannels: IPTVChannel[] = await response.json();
    console.log(`📊 Total channels fetched: ${allChannels.length}`);

    // Filter French channels
    const frenchChannels = allChannels.filter(channel => 
      channel.languages?.includes('fra') || 
      channel.country === 'FR' ||
      channel.name.includes('France') ||
      channel.name.includes('TF1') ||
      channel.name.includes('M6')
    );

    console.log(`🇫🇷 French channels found: ${frenchChannels.length}`);

    // Prepare channels for database
    const channelsToInsert = frenchChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      logo: channel.logo || null,
      country: channel.country || 'FR',
      categories: channel.categories || [],
      languages: channel.languages || ['fra'],
      url: channel.stream_url || '',
    }));

    // Clear existing channels and insert new ones
    console.log('🗑️ Clearing existing channels...');
    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .neq('id', ''); // Delete all

    if (deleteError) {
      console.error('Error deleting channels:', deleteError);
      throw deleteError;
    }

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < channelsToInsert.length; i += batchSize) {
      const batch = channelsToInsert.slice(i, i + batchSize);
      
      console.log(`💾 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(channelsToInsert.length / batchSize)}...`);
      
      const { error: insertError } = await supabase
        .from('channels')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }

      insertedCount += batch.length;
    }

    console.log(`✅ Successfully synchronized ${insertedCount} channels`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synchronized ${insertedCount} channels`,
        totalChannels: insertedCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in sync-channels:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
