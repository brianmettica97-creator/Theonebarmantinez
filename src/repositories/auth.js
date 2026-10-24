// Autenticación administrativa. En Supabase: email/contraseña + verificación de rol en `profiles`.
// En demo local NO hay credenciales: el panel de demostración usa datos del navegador.
import { BACKEND } from '../config/env.js';
import { supabase } from './supabaseClient.js';

const DEMO_FLAG = 'novantiq-one:demo-admin';

async function loadRole(userId) {
  const { data, error } = await supabase.from('profiles').select('role,full_name').eq('id', userId).maybeSingle();
  if (error) return null;
  return data;
}

export const auth = {
  kind: BACKEND,
  async getSession() {
    if (BACKEND === 'local') {
      try { return localStorage.getItem(DEMO_FLAG) ? { user: { email: 'demo@local' }, role: 'admin', demo: true } : null; } catch { return null; }
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const profile = await loadRole(data.session.user.id);
    if (!profile || !['admin', 'editor'].includes(profile.role)) return { denied: true, user: data.session.user };
    return { user: data.session.user, role: profile.role };
  },
  async signIn(email, password) {
    if (BACKEND === 'local') { try { localStorage.setItem(DEMO_FLAG, '1'); } catch { /* noop */ } return this.getSession(); }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email o contraseña incorrectos.');
    return this.getSession();
  },
  async signOut() {
    if (BACKEND === 'local') { try { localStorage.removeItem(DEMO_FLAG); } catch { /* noop */ } return; }
    await supabase.auth.signOut();
  },
  async requestPasswordReset(email) {
    if (BACKEND === 'local') throw new Error('La recuperación de contraseña requiere Supabase configurado.');
    const redirectTo = location.origin + location.pathname;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error('No se pudo enviar el correo. Intentá más tarde.');
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
  onRecovery(cb) {
    if (BACKEND !== 'supabase') return;
    supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') cb(); });
  },
};
