import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    'https://dbjosvjogszdoitnclly.supabase.co',
    'sb_publishable_Nn0JiWsm0mdRe3aQmF-PYw_qWz7rPSr'
  );
}
