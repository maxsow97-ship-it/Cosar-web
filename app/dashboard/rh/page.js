import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RHClient from './RHClient';

export default async function RHPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) redirect('/dashboard');

  const [{ data: agents }, { data: contracts }, { data: sanctions }, { data: evaluations }, { data: formationStatus }, { data: leaves }, { data: sites }, { data: promotions }, { data: k9dogs }, { count: alarmCount }] = await Promise.all([
    supabase.from('profiles').select('id, nom_complet, matricule, telephone, actif').eq('role', 'agent').order('nom_complet'),
    supabase.from('contracts').select('*').order('date_debut', { ascending: false }),
    supabase.from('sanctions').select('*').order('date_sanction', { ascending: false }),
    supabase.from('evaluations').select('*').order('created_at', { ascending: false }),
    supabase.from('v_agent_formation_status').select('*').order('nom_complet'),
    supabase.from('leaves').select('*').order('created_at', { ascending: false }),
    supabase.from('sites').select('*').order('nom'),
    supabase.from('promotions').select('*').order('date_effet', { ascending: false }),
    supabase.from('k9_dogs').select('*').order('nom'),
    supabase.from('alarms').select('*', { count: 'exact', head: true }).in('statut', ['ouvert', 'en_cours', 'open']),
  ]);

  const pendingLeaves = (leaves || []).filter(l => ['en_attente', 'pending'].includes(String(l.statut || '').toLowerCase())).length;

  return (
    <RHClient
      userName={profile.nom_complet}
      role={profile.role}
      badges={{ alarms: alarmCount || 0, leaves: pendingLeaves }}
      initialAgents={agents || []}
      initialContracts={contracts || []}
      initialSanctions={sanctions || []}
      initialEvaluations={evaluations || []}
      initialFormationStatus={formationStatus || []}
      initialLeaves={leaves || []}
      initialSites={sites || []}
      initialPromotions={promotions || []}
      initialK9dogs={k9dogs || []}
    />
  );
}
