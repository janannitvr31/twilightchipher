import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Sign-in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sign-in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-teal-foreground/10 p-4 mb-4">
            <Shield className="h-12 w-12 text-teal-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-teal-foreground">Site Safety Checker</h1>
          <p className="text-teal-foreground/80 mt-2">Sign in to continue</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-card p-8 shadow-xl">
          <div className="text-center space-y-6">
            <p className="text-muted-foreground text-sm">
              Sign in with your Google account to access the site safety checker.
            </p>

            {/* Google Sign-In Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-12 gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
          </div>
        </div>

        {/* Admin hint */}
        <p className="text-center text-teal-foreground/60 text-xs mt-6">
          Admin access: Sign in with admin@gmail.com
        </p>
      </div>
    </div>
  );
}
