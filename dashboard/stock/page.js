import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StockClient from './StockClient';

export default async function StockPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const [stockRes, sitesRes] = await Promise.all([
    supabase.from('materiel_stock').select('*').order('created_at', { ascending: false }),
    supabase.from('sites').select('id, nom'),
  ]);

  return (
    <StockClient
      userName={profile?.nom_complet || user?.email}
      initialStock={stockRes.data || []}
      initialSites={sitesRes.data || []}
    />
  );
}
