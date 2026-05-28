import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables manually
const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)["']?/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\s]+)["']?/);

if (!urlMatch || !keyMatch) {
  console.error("No Supabase credentials found in .env");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseAnonKey = keyMatch[1];

console.log("Connecting to Supabase at:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDb() {
  try {
    const { data: sellers, error: sErr } = await supabase.from('vendedores').select('*');
    if (sErr) console.error("Error fetching vendedores:", sErr);
    else console.log(`Found ${sellers ? sellers.length : 0} sellers (vendedores).`);

    const { data: rifas, error: rErr, count } = await supabase.from('rifas').select('*', { count: 'exact' });
    if (rErr) console.error("Error fetching rifas:", rErr);
    else {
      console.log(`Found ${count} tickets (rifas) in the DB.`);
      if (rifas && rifas.length > 0) {
        console.log("Sample ticket:", rifas[0]);
        const availableCount = rifas.filter(r => r.is_available).length;
        const unassignedCount = rifas.filter(r => r.vendedor_id === null).length;
        console.log(`Available tickets count: ${availableCount}`);
        console.log(`Unassigned tickets count (vendedor_id is null): ${unassignedCount}`);
      }
    }

    const { data: sales, error: saErr } = await supabase.from('rifas_vendidas').select('*');
    if (saErr) console.error("Error fetching rifas_vendidas:", saErr);
    else console.log(`Found ${sales ? sales.length : 0} purchases (rifas_vendidas).`);

  } catch (error) {
    console.error("Unexpected error in checkDb:", error);
  }
}

checkDb();
