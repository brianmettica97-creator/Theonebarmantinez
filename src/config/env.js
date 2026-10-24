// Única puerta de entrada a las variables de entorno del frontend.
const env = import.meta.env;

export const APP_MODE = env.VITE_APP_MODE === 'production' ? 'production' : 'demo';
export const IS_DEMO = APP_MODE === 'demo';
export const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').trim();
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY || '').trim();
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const SITE_URL = (env.VITE_SITE_URL || '').trim();
export const MAX_IMAGE_MB = Number(env.VITE_MAX_IMAGE_MB) > 0 ? Number(env.VITE_MAX_IMAGE_MB) : 5;

// Backend efectivo: Supabase si está configurado; si no, almacenamiento local (solo demo).
export const BACKEND = HAS_SUPABASE ? 'supabase' : 'local';

// En producción es obligatorio un backend real: nunca se usan datos locales.
export const CONFIG_ERROR =
  !IS_DEMO && !HAS_SUPABASE
    ? 'Modo producción sin Supabase configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    : null;
