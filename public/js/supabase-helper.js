/* Supabase Helper Client Logic (supabase-helper.js) */

const DEFAULT_SUPABASE_URL = 'https://bvdwxgfixirisqaavskj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8n4-tEnAx5J98ZMh_QwZiw_Qcncleqx';

class SupabaseHelper {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized && this.client) return;

    let supabaseUrl = DEFAULT_SUPABASE_URL;
    let supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

    try {
      const isNative = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor');
      const apiUrl = isNative ? 'https://pedigochos.onrender.com/api/config/supabase' : '/api/config/supabase';
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const config = await response.json();
        if (config.supabaseUrl && config.supabaseAnonKey) {
          supabaseUrl = config.supabaseUrl;
          supabaseAnonKey = config.supabaseAnonKey;
        }
      }
    } catch (err) {
      console.warn('Usando credenciales de Supabase locales/respaldo:', err);
    }

    if (supabaseUrl && supabaseAnonKey) {
      if (typeof supabase !== 'undefined') {
        this.client = supabase.createClient(supabaseUrl, supabaseAnonKey);
        this.initialized = true;
        console.log('✅ Supabase client initialized successfully.');
      } else {
        console.warn('⚠️ Supabase SDK not loaded on window.');
      }
    }
  }

  async loginWithGoogle(redirectToPage) {
    await this.init();
    if (!this.client) {
      alert('⚠️ No se pudo conectar con el servicio de autenticación. Por favor intenta de nuevo.');
      return;
    }
    
    // Determine the page to redirect back to
    let targetPage = redirectToPage;
    if (!targetPage) {
      const path = window.location.pathname || '';
      if (path.includes('admin')) {
        targetPage = '/admin.html';
      } else if (path.includes('kitchen')) {
        targetPage = '/kitchen.html';
      } else {
        targetPage = '/index.html';
      }
    }

    const isNative = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor');
    const redirectUrl = isNative 
      ? 'https://pedigochos.onrender.com' + targetPage
      : window.location.origin + targetPage;
    
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });

    if (error) {
      console.error('Error logging in with Google:', error.message);
      alert('Error al iniciar sesión con Google: ' + error.message);
    }
  }

  async logout() {
    await this.init();
    if (this.client) {
      await this.client.auth.signOut();
    }
  }

  async getCurrentSession() {
    await this.init();
    if (!this.client) return null;
    try {
      const { data } = await this.client.auth.getSession();
      if (data && data.session) return data.session;
      const { data: userData } = await this.client.auth.getUser();
      if (userData && userData.user) {
        return { user: userData.user };
      }
    } catch (e) {
      console.warn('Error fetching session:', e);
    }
    return null;
  }

  async getUserRole(email) {
    await this.init();
    if (!this.client) return null;
    
    // Query user_roles table for role mappings
    const { data, error } = await this.client
      .from('user_roles')
      .select('role, establishment_id')
      .eq('email', email)
      .single();
      
    if (error) {
      console.warn('No custom role found in user_roles or error querying:', error.message);
      return null;
    }
    
    return data; // { role: 'customer'|'merchant'|'owner', establishment_id }
  }
}

const SupabaseApp = new SupabaseHelper();
window.SupabaseApp = SupabaseApp;
