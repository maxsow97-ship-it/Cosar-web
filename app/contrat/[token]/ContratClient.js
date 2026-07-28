'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dbjosvjogszdoitnclly.supabase.co',
  'sb_publishable_Nn0JiWsm0mdRe3aQmF-PYw_qWz7rPSr'
);

function fmtFCFA(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch (e) { return iso; }
}
function fmtDateTime(iso) {
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
}

export default function ContratClient({ invoice, token }) {
  const [signed, setSigned] = useState(!!invoice.contract_accepted_at);
  const [signedAt, setSignedAt] = useState(invoice.contract_accepted_at);
  const [signatureName, setSignatureName] = useState(invoice.contract_signature_name || '');
  const [typedName, setTypedName] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSign(e) {
    e.preventDefault();
    if (!typedName.trim() || !checked) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase
      .from('invoices')
      .update({
        contract_accepted_at: new Date().toISOString(),
        contract_signature_name: typedName.trim(),
      })
      .eq('access_token', token)
      .is('contract_accepted_at', null)
      .select()
      .maybeSingle();
    setBusy(false);
    if (err || !data) {
      setError("Une erreur est survenue, ou ce contrat a déjà été signé. Recharge la page.");
      return;
    }
    setSigned(true);
    setSignedAt(data.contract_accepted_at);
    setSignatureName(data.contract_signature_name);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div className="font-bold text-2xl"><span className="text-[#F8C018]">COSAR</span> <span className="text-[#182038]">GROUP</span></div>
          <div className="text-sm text-slate-500">La sécurité, sans détour.</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Facture</div>
              <div className="font-semibold text-[#182038] text-lg">{invoice.invoice_number}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Date</div>
              <div className="text-sm text-slate-600">{fmtDate(invoice.created_at)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Client</div>
            <div className="font-medium text-[#182038]">{invoice.client_nom}</div>
            <div className="text-sm text-slate-500">{invoice.client_email} {invoice.client_telephone}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Prestations contractées</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-500">
                    <th className="p-2.5">Prestation</th>
                    <th className="p-2.5">Qté</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.lignes || []).map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-2.5">{l.nom}</td>
                      <td className="p-2.5">{l.quantite}</td>
                      <td className="p-2.5 text-right">{fmtFCFA(l.total_ht || l.quantite * l.prix_unitaire_ht)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-sm mt-2 space-y-0.5">
              <div className="text-slate-500">Total HT : {fmtFCFA(invoice.total_ht)}</div>
              <div className="font-bold text-[#182038]">Total TTC : {fmtFCFA(invoice.total_ttc)}</div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            {signed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="text-emerald-700 font-semibold mb-1">✓ Contrat accepté</div>
                <div className="text-sm text-emerald-600">
                  Signé par <span className="font-medium">{signatureName}</span> le {fmtDateTime(signedAt)}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSign} className="space-y-4">
                <div className="text-sm text-slate-600">
                  En signant ci-dessous, vous confirmez avoir pris connaissance des prestations listées ci-dessus et acceptez les conditions de ce contrat avec COSAR GROUP.
                </div>
                <div>
                  <label className="text-xs text-slate-500">Nom complet (signature)</label>
                  <input
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Votre nom et prénom"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mt-1 italic"
                    style={{ fontFamily: 'cursive' }}
                    required
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
                  <span>Je confirme avoir lu et j&apos;accepte les prestations et conditions ci-dessus.</span>
                </label>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <button disabled={busy || !typedName.trim() || !checked} className="btn-gold w-full justify-center disabled:opacity-50">
                  {busy ? 'Signature en cours…' : 'Signer et accepter'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          COSAR GROUP — 77 cité Djily Mbaye, Yoff, Dakar
        </div>
      </div>
    </div>
  );
}
