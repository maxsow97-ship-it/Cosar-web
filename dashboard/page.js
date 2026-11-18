import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const [devisRes, analyticsRes] = await Promise.all([
    supabase.from('devis').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('analytics_events').select('event_type, page, created_at').order('created_at', { ascending: false }).limit(3000),
  ]);

  return (
    <DashboardClient
      userName={profile?.nom_complet || user?.email}
      initialDevis={devisRes.data || []}
      analyticsEvents={analyticsRes.data || []}
    />
  );
}
