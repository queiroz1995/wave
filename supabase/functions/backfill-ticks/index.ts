// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to connect and call Deriv API
async function callDerivApi(request: any) {
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

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json();
    if (!symbol) {
      throw new Error("Asset symbol is required.");
    }

    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // 2. Fetch history from Deriv API
    const historyResponse: any = await callDerivApi({
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
    })) || [];

    if (ticks.length === 0) {
      return new Response(JSON.stringify({ message: `No new ticks for ${symbol}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
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

    return new Response(JSON.stringify({ message: `Successfully inserted ${ticksToInsert.length} new ticks for ${symbol}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})