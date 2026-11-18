import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AlarmesClient from './AlarmesClient';

export default async function AlarmesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) redirect('/dashboard');

  const [{ data: alarms }, { data: devices }, { data: sites }, { data: trackedAssets }, { data: clientMessages }, { data: leaves }] = await Promise.all([
    supabase.from('alarms').select('*').order('declenchee_at', { ascending: false }).limit(100),
    supabase.from('devices').select('*').order('created_at', { ascending: false }),
    supabase.from('sites').select('id, nom'),
    supabase.from('tracked_assets').select('*').order('created_at', { ascending: false }),
    supabase.from('client_messages').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('leaves').select('statut'),
  ]);

  const assetIds = (trackedAssets || []).map(a => a.id);
  const { data: trackedPositions } = assetIds.length > 0
    ? await supabase.from('tracked_positions').select('*').in('asset_id', assetIds).order('horodatage', { ascending: false }).limit(500)
    : { data: [] };

  const openAlarms = (alarms || []).filter(a => ['ouvert', 'en_cours', 'open'].includes(String(a.statut || '').toLowerCase())).length;
  const pendingLeaves = (leaves || []).filter(l => ['en_attente', 'pending'].includes(String(l.statut || '').toLowerCase())).length;

  return (
    <AlarmesClient
      userName={profile.nom_complet}
      role={profile.role}
      badges={{ alarms: openAlarms, leaves: pendingLeaves }}
      initialAlarms={alarms || []}
      initialDevices={devices || []}
      initialSites={sites || []}
      initialTrackedAssets={trackedAssets || []}
      initialTrackedPositions={trackedPositions || []}
      initialClientMessages={clientMessages || []}
    />
  );
}
