'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const code = params.get('code');

    async function init() {
      // Lien Supabase au format PKCE (?code=...) : on l'échange contre une session.
      if (code) await supabase.auth.exchangeCodeForSession(code);
      const { data: { session } } = await supabase.auth.getSession();
      setReady(!!session);
      setChecking(false);
    }
    init();

    // Lien au format implicite (#access_token=...) : détecté automatiquement par le client.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setReady(true);
        setChecking(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Impossible d'enregistrer le nouveau mot de passe. Demandez un nouveau lien.");
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#182038] to-[#10182C] px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold">
            <span className="text-[#D9A600]">COSAR</span> <span className="text-[#182038]">ONE</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Nouveau mot de passe</p>
        </div>

        {error && (
          <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {checking ? (
          <p className="text-center text-sm text-slate-500">Vérification du lien…</p>
        ) : !ready ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">Ce lien est invalide ou a expiré.</p>
            <a href="/login" className="btn-gold inline-flex justify-center w-full">Demander un nouveau lien</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nouveau mot de passe</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
                placeholder="8 caractères minimum"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmer le mot de passe</label>
              <input
                type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-60">
              {loading ? 'Enregistrement…' : 'Enregistrer et se connecter'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
