import { createClient } from '@supabase/supabase-js';

// Try to get environment variables from import.meta.env (Vite's way of accessing env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase-demo-instance.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzY5MDAwMCwiZXhwIjoxOTM5MjUwMDAwfQ.a1XuuYjEYL6CyTqriG8YAVFpSafRvQKNYmO9P5XcJj0';

// Only log in development mode
if (import.meta.env.DEV) {
  console.log('Supabase initialization:', {
    'URL exists': !!supabaseUrl,
    'Key exists': !!supabaseAnonKey
  });
}

// Validate configuration before creating client
if (!supabaseUrl || supabaseUrl === 'https://supabase-demo-instance.supabase.co') {
  console.warn('Warning: Using default Supabase URL. This may not be a valid instance.');
}

if (!supabaseAnonKey) {
  console.error('Error: No Supabase anonymous key provided. Authentication will fail.');
}

// Create a single supabase client for interacting with your database
let supabase;
try {
  // Only log in development mode
  if (import.meta.env.DEV) {
    console.log('Initializing Supabase client...');
  }
  
  const fetchWithRetry = async (...args) => {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(...args);
        if (response.status !== 429 || attempt === maxRetries) {
          return response;
        }
        const waitTime = 500 * Math.pow(2, attempt);
        if (import.meta.env.DEV) {
          console.warn(`Supabase 429 received. Retrying in ${waitTime}ms`);
        }
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } catch (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }
    }
  };

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // désactive le refresh auto pour couper le spam 429
      persistSession: true,
      detectSessionInUrl: true
    },
    // Handle rate limits from Supabase API
    global: { fetch: fetchWithRetry },
    // Add caching to improve performance
    realtime: {
      timeout: 30000 // longer timeout for stability
    }
  });
  
  if (import.meta.env.DEV) {
    console.log('Supabase client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Provide a minimal client that won't crash the app but will log errors
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error('Supabase client failed to initialize') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      // Add other methods as needed
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: new Error('Supabase client failed to initialize') })
        })
      }),
      insert: () => ({ error: new Error('Supabase client failed to initialize') }),
      update: () => ({ error: new Error('Supabase client failed to initialize') })
    })
  };
}

export default supabase;

window.supabase = supabase;

