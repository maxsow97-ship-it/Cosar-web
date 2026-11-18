import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UtilisateursClient from './UtilisateursClient';

export default async function UtilisateursPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=acces_refuse');
  }

  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

  return (
    <UtilisateursClient
      userName={profile?.nom_complet || user?.email}
      initialUsers={users || []}
    />
  );
}
