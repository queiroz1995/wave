// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VOLATILITY_INDICES = [
  '1HZ10V',
  '1HZ25V',
  '1HZ50V',
  '1HZ75V',
  '1HZ100V',
  'R_10',
  'R_25',
  'R_50',
  'R_75',
  'R_100'
];

// Helper to connect and call Deriv API
async function callDerivApi(request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

    ws.onopen = () => {
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.error) {
        reject(new Error(data.error.message));
      } else {
        resolve(data);
      }
      ws.close();
    };

    ws.onerror = (err) => {
      reject(err);
      ws.close();
    };
  });
}

async function backfillSymbol(symbol: string, supabaseAdmin: SupabaseClient) {
  console.log(`Starting backfill for ${symbol}...`);

  // 1. Find the latest tick epoch in the DB for the given symbol
  const { data: latestTick, error: latestTickError } = await supabaseAdmin
    .from('ticks')
    .select('epoch')
    .eq('symbol', symbol)
    .order('epoch', { ascending: false })
    .limit(1)
    .single();

  if (latestTickError && latestTickError.code !== 'PGRST116') { // Ignore "Missing row" error
    throw latestTickError;
  }

  const startEpoch = latestTick ? latestTick.epoch + 1 : Math.floor(Date.now() / 1000) - (24 * 60 * 60); // If no data, get last 24 hours
  console.log(`Fetching ticks for ${symbol} from epoch ${startEpoch}.`);

  // 2. Fetch history from Deriv API
  const historyResponse = await callDerivApi({
    ticks_history: symbol,
    end: "latest",
    start: startEpoch,
    style: "ticks",
    count: 5000 // Max count
  });

  if (!historyResponse.history || !Array.isArray(historyResponse.history.prices) || !Array.isArray(historyResponse.history.times)) {
    throw new Error("Deriv did not return a valid ticks history payload.");
  }

  const ticks = historyResponse.history.times.map((time: number, index: number) => ({
    epoch: time,
    price: historyResponse.history.prices[index],
  }));

  if (ticks.length === 0) {
    console.log(`No new ticks found for ${symbol}.`);
    return { message: `No new ticks for ${symbol}.`, inserted: 0 };
  }

  // 3. Format and upsert new ticks into DB
  const ticksToInsert = ticks.map((tick: any) => ({
    symbol: symbol,
    epoch: tick.epoch,
    digit: parseInt(tick.price.toString().slice(-1)),
    type: 'history'
  }));

  const { error: insertError } = await supabaseAdmin
    .from('ticks')
    .upsert(ticksToInsert, { onConflict: 'symbol,epoch' });

  if (insertError) {
    throw insertError;
  }
  
  console.log(`Successfully inserted ${ticksToInsert.length} new ticks for ${symbol}.`);
  return { message: `Successfully inserted ${ticksToInsert.length} new ticks for ${symbol}.`, inserted: ticksToInsert.length };
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = [];
    for (const symbol of VOLATILITY_INDICES) {
      try {
        const result = await backfillSymbol(symbol, supabaseAdmin);
        results.push({ symbol, status: 'success', ...result });
      } catch (error) {
        console.error(`Failed to backfill ${symbol}:`, error.message);
        results.push({ symbol, status: 'error', message: error.message });
      }
    }
    
    return new Response(JSON.stringify({ message: "Backfill process completed for all volatility indices.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("General error in backfill function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})