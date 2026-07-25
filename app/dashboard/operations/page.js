import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OperationsClient from './OperationsClient';

export default async function OperationsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [sitesRes, agentsRes, pointagesRes, incidentsRes, scansRes, mcRes, pointsRes] = await Promise.all([
    supabase.from('sites').select('*'),
    supabase.from('profiles').select('id, nom_complet, role, telephone').eq('role', 'agent'),
    supabase.from('pointages').select('*').gte('horodatage', todayStart.toISOString()).order('horodatage', { ascending: false }),
    supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('rondes_scans').select('*').order('horodatage', { ascending: false }).limit(30),
    supabase.from('main_courante').select('*').order('horodatage', { ascending: false }).limit(20),
    supabase.from('points_ronde').select('id, nom, site_id'),
  ]);

  return (
    <OperationsClient
      userName={profile?.nom_complet || user?.email}
      initialSites={sitesRes.data || []}
      initialAgents={agentsRes.data || []}
      initialPointages={pointagesRes.data || []}
      initialIncidents={incidentsRes.data || []}
      initialScans={scansRes.data || []}
      initialMC={mcRes.data || []}
      initialPoints={pointsRes.data || []}
    />
  );
}
