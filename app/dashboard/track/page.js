import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TrackClient from './TrackClient';

export default async function TrackPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const { data: assets } = await supabase.from('tracked_assets').select('*').order('created_at', { ascending: false });

  return <TrackClient userName={profile?.nom_complet || user?.email} initialAssets={assets || []} />;
}
