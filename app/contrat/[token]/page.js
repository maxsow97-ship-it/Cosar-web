import { createClient } from '@supabase/supabase-js';
import ContratClient from './ContratClient';
import { notFound } from 'next/navigation';

const supabase = createClient(
  'https://dbjosvjogszdoitnclly.supabase.co',
  'sb_publishable_Nn0JiWsm0mdRe3aQmF-PYw_qWz7rPSr'
);

export default async function ContratPage({ params }) {
  const { token } = params;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (error || !invoice) {
    notFound();
  }

  return <ContratClient invoice={invoice} token={token} />;
}
