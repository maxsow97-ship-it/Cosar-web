import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SitesClient from './SitesClient';

export default async function SitesPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const [sitesRes, pointsRes] = await Promise.all([
    supabase.from('sites').select('*').order('created_at', { ascending: false }),
    supabase.from('points_ronde').select('*').order('ordre'),
  ]);

  return (
    <SitesClient
      userName={profile?.nom_complet || user?.email}
      initialSites={sitesRes.data || []}
      initialPoints={pointsRes.data || []}
    />
  );
}
