'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [info, setInfo] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const accessDenied = params.get('error') === 'acces_refuse';

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function handleReset(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser`,
    });
    setLoading(false);
    if (error) {
      setError("Impossible d'envoyer l'email. Réessayez dans quelques minutes.");
      return;
    }
    setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient de vous être envoyé.');
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setInfo('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#182038] to-[#10182C] px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold">
            <span className="text-[#D9A600]">COSAR</span> <span className="text-[#182038]">ONE</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Back Office — Administration</p>
        </div>

        {accessDenied && (
          <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
            Ce compte n&apos;a pas accès au back office.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2">
            {info}
          </div>
        )}

        {mode === 'reset' ? (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-slate-600">
              Saisissez l&apos;email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
                placeholder="vous@cosar-group.online"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-60">
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <button type="button" onClick={() => switchMode('login')} className="w-full text-xs text-slate-500 hover:text-[#182038]">
              ← Retour à la connexion
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
              placeholder="vous@cosar-group.online"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8C018]"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-60">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
          <button type="button" onClick={() => switchMode('reset')} className="w-full text-xs text-slate-500 hover:text-[#182038]">
            Mot de passe oublié ?
          </button>
        </form>
        )}
        <p className="text-center text-xs text-slate-400 mt-6">
          Utilisez le même compte que l&apos;espace client/agent COSAR ONE.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
