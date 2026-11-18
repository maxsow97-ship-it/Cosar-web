import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import K9Client from './K9Client';

export default async function K9Page() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const [dogsRes, agentsRes] = await Promise.all([
    supabase.from('k9_dogs').select('*').order('nom'),
    supabase.from('profiles').select('id, nom_complet').eq('role', 'agent'),
  ]);

  return (
    <K9Client
      userName={profile?.nom_complet || user?.email}
      initialDogs={dogsRes.data || []}
      initialAgents={agentsRes.data || []}
    />
  );
}
