import { useState, useEffect } from "react";
import {
  Search,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Play,
  ExternalLink,
  Info,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScoreCircle } from "@/components/ScoreCircle";
import { SignalCard } from "@/components/SignalCard";
import LoginScreen from "@/components/LoginScreen"; 
import { AdminPanel } from "@/components/AdminPanel";

import {
  checkSiteSafety,
  isValidUrl,
  STRINGS,
  TEST_URLS,
  type CheckResult,
} from "@/lib/safety-checker";

import { recordSignIn, recordSignOut, isAdmin } from "@/lib/auth-storage";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import type { User, Session } from "@supabase/supabase-js";

interface CurrentUser {
  name: string;
  email: string;
  picture: string;
  signInTime: string;
}

export function SiteSafetyChecker() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [useApiMocks, setUseApiMocks] = useState(false);
  const [copied, setCopied] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const meta = session.user.user_metadata;

          const newUser: CurrentUser = {
            name:
              meta.full_name ||
              meta.name ||
              session.user.email?.split("@")[0] ||
              "User",
            email: session.user.email || "",
            picture: meta.avatar_url || meta.picture || "",
            signInTime: new Date().toLocaleString(),
          };

          setCurrentUser(newUser);

          if (event === "SIGNED_IN") {
            recordSignIn(newUser.name, newUser.email);
            toast({
              title: "Welcome!",
              description: `Signed in as ${newUser.name}`,
            });
          }
        } else {
          setCurrentUser(null);
        }

        setIsAuthLoading(false);
      });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const meta = session.user.user_metadata;
        setCurrentUser({
          name:
            meta.full_name ||
            meta.name ||
            session.user.email?.split("@")[0] ||
            "User",
          email: session.user.email || "",
          picture: meta.avatar_url || meta.picture || "",
          signInTime: new Date().toLocaleString(),
        });
      }

      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (currentUser) recordSignOut(currentUser.email);

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUrl("");
    setResult(null);

    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session || !currentUser) {
    return <LoginScreen />;
  }

  const userIsAdmin = isAdmin(currentUser.email);

  const handleCheck = async () => {
    if (!url.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }

    if (!isValidUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const checkResult = await checkSiteSafety(url, useApiMocks);
      setResult(checkResult);
      setShowWhy(true);
    } catch {
      toast({
        title: "Error checking site",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDemo = async () => {
    const test = TEST_URLS[demoIndex];
    setUrl(test.url);
    setDemoIndex((i) => (i + 1) % TEST_URLS.length);

    setIsLoading(true);
    const res = await checkSiteSafety(test.url, useApiMocks);
    setResult(res);
    setShowWhy(true);
    setIsLoading(false);
  };

  const handleCopyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(
      `URL: ${result.normalizedUrl}\nScore: ${result.score}\nVerdict: ${result.verdictText}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield />
          <h1 className="font-bold">{STRINGS.title}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {userIsAdmin && <AdminPanel />}

        <div className="flex gap-2">
          <Input
            placeholder={STRINGS.inputPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          />
          <Button onClick={handleCheck} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : "Check"}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Switch checked={useApiMocks} onCheckedChange={setUseApiMocks} />
          <span>{STRINGS.apiToggle}</span>
          <Button variant="outline" onClick={handleRunDemo}>
            <Play className="h-4 w-4 mr-1" /> Demo
          </Button>
        </div>

        {result && (
          <>
            <ScoreCircle score={result.score} verdict={result.verdict} />

            <Button variant="outline" onClick={handleCopyResult}>
              {copied ? <Check /> : <Copy />} Copy result
            </Button>

            {showWhy && (
              <div className="grid gap-3">
                {result.signals.map((s, i) => (
                  <SignalCard key={s.id} signal={s} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
