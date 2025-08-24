import { createClient } from '@supabase/supabase-js';

// Récupération stricte des variables d'environnement (⚠️ plus de fallback démo)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Logs utiles en dev
if (import.meta.env.DEV) {
  console.log('Supabase initialization:', {
    'URL exists': !!supabaseUrl,
    'Key exists': !!supabaseAnonKey
  });
}

// Validation stricte
if (!supabaseUrl) {
  throw new Error("❌ VITE_SUPABASE_URL manquant dans .env.local");
}
if (!supabaseAnonKey) {
  throw new Error("❌ VITE_SUPABASE_ANON_KEY manquant dans .env.local");
}

// Création du client Supabase
let supabase;
try {
  if (import.meta.env.DEV) {
    console.log('Initializing Supabase client...');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (...args) =>
        fetch(...args).catch((error) => {
          console.error('Supabase fetch error:', error);
          throw error;
        }),
    },
    realtime: {
      timeout: 30000, // stabilité accrue
    },
  });

  if (import.meta.env.DEV) {
    console.log('✅ Supabase client initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);

  // Mode dégradé si jamais l'init échoue
  supabase = {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: new Error('Supabase client failed to initialize'),
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: new Error('Supabase client failed to initialize'),
          }),
        }),
      }),
      insert: () => ({ error: new Error('Supabase client failed to initialize') }),
      update: () => ({ error: new Error('Supabase client failed to initialize') }),
    }),
  };
}

export default supabase;

// Debug console en dev
if (import.meta.env.DEV) {
  window.supabase = supabase;
}
