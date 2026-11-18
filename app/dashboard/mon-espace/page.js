import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MonEspaceClient from './MonEspaceClient';

export default async function MonEspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'agent') redirect('/dashboard');

  const [{ data: contracts }, { data: evaluations }, { data: sanctions }, { data: leaves }, { data: formationStatus }] = await Promise.all([
    supabase.from('contracts').select('*').eq('agent_id', user.id).eq('statut', 'actif').order('date_debut', { ascending: false }).limit(1),
    supabase.from('evaluations').select('*').eq('agent_id', user.id).order('created_at', { ascending: false }),
    supabase.from('sanctions').select('*').eq('agent_id', user.id).order('date_sanction', { ascending: false }),
    supabase.from('leaves').select('*').eq('agent_id', user.id).order('created_at', { ascending: false }),
    supabase.from('v_agent_formation_status').select('*').eq('agent_id', user.id).maybeSingle(),
  ]);

  return (
    <MonEspaceClient
      userName={profile.nom_complet}
      role={profile.role}
      contract={contracts?.[0] || null}
      evaluations={evaluations || []}
      sanctions={sanctions || []}
      leaves={leaves || []}
      formationStatus={formationStatus || null}
    />
  );
}
