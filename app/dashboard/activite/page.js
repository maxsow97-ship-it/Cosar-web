import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ActiviteClient from './ActiviteClient';

export default async function ActivitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  // Si la table activity_logs existe, on la charge ; sinon le client utilise le log local
  let serverLogs = [];
  try {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    serverLogs = data || [];
  } catch (_) {
    serverLogs = [];
  }

  return (
    <ActiviteClient
      userName={profile.nom_complet}
      role={profile.role}
      serverLogs={serverLogs}
    />
  );
}
