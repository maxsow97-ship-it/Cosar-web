import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    'https://dbjosvjogszdoitnclly.supabase.co',
    'sb_publishable_Nn0JiWsm0mdRe3aQmF-PYw_qWz7rPSr',
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            // appelé depuis un Server Component : ignoré, le middleware gère le refresh
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (e) {}
        },
      },
    }
  );
}
