import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CatalogueClient from './CatalogueClient';

export default async function CataloguePage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('nom_complet, role').eq('id', user.id).maybeSingle();
  if (!profile || !['admin', 'superviseur'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }

  const [servicesRes, invoicesRes, devisRes] = await Promise.all([
    supabase.from('service_catalog').select('*').order('created_at'),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('devis').select('id, nom, email, telephone').order('created_at', { ascending: false }).limit(100),
  ]);

  return (
    <CatalogueClient
      userName={profile?.nom_complet || user?.email}
      initialServices={servicesRes.data || []}
      initialInvoices={invoicesRes.data || []}
      initialDevis={devisRes.data || []}
    />
  );
}
