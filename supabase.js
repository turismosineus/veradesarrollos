// Conexión con Supabase.
// La Project URL y la clave pública (publishable) son PÚBLICAS: pueden ir en el
// código del front. La seguridad real la dan las reglas de acceso (RLS) y el login.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://venfyozyiswfxjrsyodh.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_z9tC6tmASn65IDTAthflPw_oruDSxi1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
