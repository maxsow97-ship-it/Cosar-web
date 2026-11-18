import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ParametresClient from './ParametresClient';

export default async function ParametresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nom_complet, role, telephone, email, matricule')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <ParametresClient
      userName={profile.nom_complet}
      role={profile.role}
      profile={{
        nom_complet: profile.nom_complet,
        telephone: profile.telephone,
        email: profile.email || user.email,
        matricule: profile.matricule,
        role: profile.role,
      }}
    />
  );
}
