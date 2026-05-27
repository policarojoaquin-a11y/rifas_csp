import { createClient } from '@supabase/supabase-js';

// Helper to sanitize any enclosing quotes from environment variable definitions to prevent invalid URLs
function cleanEnvValue(value: string | undefined): string {
  if (!value) return '';
  let cleaned = value.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

// Robust parsing function to extract URL & Anon Key even if they are squashed or malformed
function parseComplexEnv(val1: string, val2: string): { url: string; key: string } {
  let finalUrl = val1;
  let finalKey = val2;

  const combined = `${val1} ${val2}`;
  
  const urlMatch = combined.match(/VITE_SUPABASE_URL=["']?([^"'\s]+)["']?/i);
  const keyMatch = combined.match(/VITE_SUPABASE_ANON_KEY=["']?([^"'\s]+)["']?/i);

  if (urlMatch) {
    finalUrl = urlMatch[1];
  }
  if (keyMatch) {
    finalKey = keyMatch[1];
  }

  // General cleanups for double/single quotes and whitespace
  finalUrl = finalUrl.trim();
  if ((finalUrl.startsWith('"') && finalUrl.endsWith('"')) || (finalUrl.startsWith("'") && finalUrl.endsWith("'"))) {
    finalUrl = finalUrl.slice(1, -1);
  }
  finalKey = finalKey.trim();
  if ((finalKey.startsWith('"') && finalKey.endsWith('"')) || (finalKey.startsWith("'") && finalKey.endsWith("'"))) {
    finalKey = finalKey.slice(1, -1);
  }

  return { url: finalUrl, key: finalKey };
}

const rawUrl = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.VITE_SUPABASE_URL || '')
  : (process.env.VITE_SUPABASE_URL || '');
const rawKey = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  : (process.env.VITE_SUPABASE_ANON_KEY || '');

const parsed = parseComplexEnv(rawUrl, rawKey);
const supabaseUrl = parsed.url;
const supabaseAnonKey = parsed.key;

// Verify it's not empty and starts with http/https
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
