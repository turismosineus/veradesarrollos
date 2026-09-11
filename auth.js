// Autenticación con Supabase Auth (Opción B: login real).
import { supabase } from './supabase.js';

// Devuelve la sesión activa (o null si nadie está logueado).
export async function currentSession(){
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Ingresa con email + contraseña. Lanza error si las credenciales fallan.
export async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data.user;
}

// Cierra la sesión.
export async function signOut(){
  await supabase.auth.signOut();
}

// Trae el perfil (rol, proyecto, nombre) del usuario logueado.
export async function getProfile(userId){
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if(error) throw error;
  return data;
}
