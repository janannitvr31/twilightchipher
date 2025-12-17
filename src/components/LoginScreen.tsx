import { supabase } from '@/integrations/supabase/client'
export default function Login() {
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      console.error('Login error:', error.message)
    }
  }

  return (
    <div>
      <h1>Sign In</h1>
      <button onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  )
}

