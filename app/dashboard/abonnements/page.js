import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AbonnementsClient from './AbonnementsClient';

export default async function AbonnementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const [{ data: subscriptions }, { data: payments }, { data: clients }, { data: sites }, { data: crmContracts }, { count: alarmCount }] = await Promise.all([
    supabase.from('subscriptions').select('*').order('date_debut', { ascending: false }),
    supabase.from('payments').select('*').order('date_paiement', { ascending: false }).limit(50),
    supabase.from('profiles').select('id, nom_complet').eq('role', 'client'),
    supabase.from('sites').select('id, nom').order('nom'),
    supabase.from('crm_contracts').select('*').order('date_debut', { ascending: false }),
    supabase.from('alarms').select('*', { count: 'exact', head: true }).in('statut', ['ouvert', 'en_cours', 'open']),
  ]);

  return (
    <AbonnementsClient
      userName={profile.nom_complet}
      role={profile.role}
      badges={{ alarms: alarmCount || 0, leaves: 0 }}
      initialSubscriptions={subscriptions || []}
      initialPayments={payments || []}
      initialClients={clients || []}
      initialSites={sites || []}
      initialCrmContracts={crmContracts || []}
    />
  );
}
