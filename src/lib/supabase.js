import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY ?? SUPABASE_ANON_KEY

// Log envs for visibility and fail loudly if missing.
console.log('Supabase env check:', {
	VITE_SUPABASE_URL: SUPABASE_URL,
	VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
	VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
})

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('Missing Supabase env vars. Ensure VITE_SUPABASE_URL and one of VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY are set in your environment (Vercel).')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export default supabase
window.supabase = supabase
