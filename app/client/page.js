import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ClientPortalClient from './ClientPortalClient';

export default async function ClientPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'client') redirect('/dashboard');

  const { data: siteLinks } = await supabase.from('site_clients').select('site_id').eq('client_id', user.id);
  const siteIds = (siteLinks || []).map(l => l.site_id);

  if (siteIds.length === 0) {
    return <ClientPortalClient userName={profile.nom_complet} sites={[]} incidents={[]} pointages={[]} mainCourante={[]} rondesScans={[]} subscriptions={[]} alarms={[]} devices={[]} siteAgents={[]} initialMessages={[]} trackedAssets={[]} trackedPositions={[]} />;
  }

  const [{ data: sites }, { data: incidents }, { data: pointages }, { data: mainCourante }, { data: rondesScans }, { data: subscriptions }, { data: alarms }, { data: devices }, { data: messages }, { data: trackedAssets }] = await Promise.all([
    supabase.from('sites').select('*').in('id', siteIds),
    supabase.from('incidents').select('*').in('site_id', siteIds).order('created_at', { ascending: false }),
    supabase.from('pointages').select('*').in('site_id', siteIds).order('horodatage', { ascending: false }).limit(100),
    supabase.from('main_courante').select('*').in('site_id', siteIds).order('horodatage', { ascending: false }).limit(50),
    supabase.from('rondes_scans').select('*').in('site_id', siteIds).limit(100),
    supabase.from('subscriptions').select('*').in('site_id', siteIds),
    supabase.from('alarms').select('*').in('site_id', siteIds).order('declenchee_at', { ascending: false }),
    supabase.from('devices').select('*').in('site_id', siteIds),
    supabase.from('client_messages').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
    supabase.from('tracked_assets').select('*').in('site_id', siteIds),
  ]);

  const assetIds = (trackedAssets || []).map(a => a.id);
  const { data: trackedPositions } = assetIds.length > 0
    ? await supabase.from('tracked_positions').select('*').in('asset_id', assetIds).order('horodatage', { ascending: false }).limit(200)
    : { data: [] };

  // Noms d'agents via la fonction dediee (pas d'acces direct a la table profiles pour un client)
  const siteAgentsResults = await Promise.all(
    siteIds.map(id => supabase.rpc('get_site_agents_for_client', { p_site_id: id }))
  );
  const siteAgents = siteAgentsResults.flatMap((r, i) =>
    (r.data || []).map(a => ({ ...a, site_id: siteIds[i] }))
  );

  return (
    <ClientPortalClient
      userName={profile.nom_complet}
      sites={sites || []}
      incidents={incidents || []}
      pointages={pointages || []}
      mainCourante={mainCourante || []}
      rondesScans={rondesScans || []}
      subscriptions={subscriptions || []}
      alarms={alarms || []}
      devices={devices || []}
      siteAgents={siteAgents}
      initialMessages={messages || []}
      trackedAssets={trackedAssets || []}
      trackedPositions={trackedPositions || []}
    />
  );
}
