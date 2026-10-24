import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authState';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destination = ((location.state as { from?: string } | null)?.from) || '/';

  if (user) return <Navigate to={destination} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="bg-grid-dots absolute inset-0 opacity-60" />
      <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-low/95 p-7 shadow-2xl backdrop-blur md:p-9">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/favicon.png" alt="SYNAPSE AI" className="h-20 w-20 rounded-2xl object-contain drop-shadow-[0_0_18px_rgba(39,224,195,0.35)]" />
          <p className="mt-4 font-code-compact text-[10px] uppercase tracking-[0.28em] text-primary">Ambiente de Demonstração — Hackathon UNAMA</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-on-surface">Acesse sua plataforma</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Entre para acessar o ambiente seguro de demonstração do SYNAPSE AI.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-medium text-on-surface">
            E-mail
            <input name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          <label className="block text-xs font-medium text-on-surface">
            Senha
            <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">{error}</p>}
          <button type="submit" disabled={busy} className="h-11 w-full rounded-lg bg-primary text-sm font-bold text-on-primary transition hover:bg-primary-glow disabled:cursor-wait disabled:opacity-60">{busy ? 'Validando acesso...' : 'Entrar'}</button>
        </form>
        <p className="mt-6 text-center text-[11px] leading-5 text-on-surface-variant">Ambiente de demonstração protegido. As credenciais são verificadas exclusivamente pelo backend.</p>
      </section>
    </main>
  );
};
