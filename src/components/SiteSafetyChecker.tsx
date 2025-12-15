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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScoreCircle } from "@/components/ScoreCircle";
import { SignalCard } from "@/components/SignalCard";
import { LoginScreen } from "@/components/LoginScreen";
import { AdminPanel } from "@/components/AdminPanel";
import { 
  checkSiteSafety, 
  isValidUrl, 
  STRINGS, 
  TEST_URLS,
  type CheckResult 
} from "@/lib/safety-checker";
import {
  recordSignIn,
  recordSignOut,
  isAdmin,
} from "@/lib/auth-storage";
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

  // Set up auth state listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userData = session.user.user_metadata;
          const newUser: CurrentUser = {
            name: userData.full_name || userData.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            picture: userData.avatar_url || userData.picture || '',
            signInTime: new Date().toLocaleString(),
          };
          setCurrentUser(newUser);
          
          // Record sign-in on initial login
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              recordSignIn(newUser.name, newUser.email);
              toast({
                title: "Welcome!",
                description: `Signed in as ${newUser.name}`,
              });
            }, 0);
          }
        } else {
          setCurrentUser(null);
        }
        
        setIsAuthLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userData = session.user.user_metadata;
        setCurrentUser({
          name: userData.full_name || userData.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          picture: userData.avatar_url || userData.picture || '',
          signInTime: new Date().toLocaleString(),
        });
      }
      
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (currentUser) {
      recordSignOut(currentUser.email);
    }
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    setResult(null);
    setUrl("");
    
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  // Show loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-teal flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-foreground" />
      </div>
    );
  }

  // Show login screen if not logged in
  if (!session || !currentUser) {
    return (
      <div className="animate-fade-in">
        <LoginScreen />
      </div>
    );
  }

  const userIsAdmin = isAdmin(currentUser.email);
  
  const handleCheck = async () => {
    if (!url.trim()) {
      toast({
        title: "Please enter a URL",
        variant: "destructive",
      });
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
    } catch (error) {
      toast({
        title: "Error checking site",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRunDemo = async () => {
    const testUrl = TEST_URLS[demoIndex];
    setUrl(testUrl.url);
    setDemoIndex((prev) => (prev + 1) % TEST_URLS.length);
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const checkResult = await checkSiteSafety(testUrl.url, useApiMocks);
      setResult(checkResult);
      setShowWhy(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyResult = () => {
    if (!result) return;
    
    const topReasons = result.signals
      .filter(s => s.score > 0)
      .slice(0, 3)
      .map(s => `- ${s.name}: ${s.explanation}`)
      .join("\n");
    
    const report = `Site Safety Report
URL: ${result.normalizedUrl}
Verdict: ${result.verdictText}
Risk Score: ${result.score}/100
${topReasons ? `\nTop Risk Factors:\n${topReasons}` : ""}
\nChecked: ${result.timestamp.toLocaleString()}`;
    
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Result copied!",
      description: "The safety report has been copied to your clipboard.",
    });
  };
  
  const verdictColorMap = {
    safe: "bg-safe text-safe-foreground",
    "likely-safe": "bg-likely-safe text-likely-safe-foreground",
    suspicious: "bg-suspicious text-suspicious-foreground",
    scam: "bg-danger text-danger-foreground",
  };
  
  const verdictBgMap = {
    safe: "bg-safe-bg border-safe/20",
    "likely-safe": "bg-likely-safe-bg border-likely-safe/20",
    suspicious: "bg-suspicious-bg border-suspicious/20",
    scam: "bg-danger-bg border-danger/20",
  };
  
  return (
    <div className="min-h-screen bg-teal animate-fade-in">
      {/* Header */}
      <header className="border-b border-teal-foreground/20 bg-teal-dark/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-foreground/20 p-2">
                <Shield className="h-6 w-6 text-teal-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-teal-foreground">{STRINGS.title}</h1>
                <p className="text-sm text-teal-foreground/70">{STRINGS.subtitle}</p>
              </div>
            </div>
            
            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-3">
              {/* User Avatar & Name */}
              <div className="hidden sm:flex items-center gap-2">
                {currentUser.picture ? (
                  <img 
                    src={currentUser.picture} 
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border-2 border-teal-foreground/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-teal-foreground/30 bg-teal-foreground/20 flex items-center justify-center">
                    <span className="text-teal-foreground text-sm font-medium">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-teal-foreground">{currentUser.name}</p>
                  <p className="text-xs text-teal-foreground/60">{currentUser.email}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2 bg-teal-foreground/10 border-teal-foreground/30 text-teal-foreground hover:bg-teal-foreground/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Mobile User Profile */}
        <div className="sm:hidden mb-6 flex items-center gap-3 p-4 rounded-2xl bg-card">
          {currentUser.picture ? (
            <img 
              src={currentUser.picture} 
              alt={currentUser.name}
              className="w-12 h-12 rounded-full border-2 border-teal/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full border-2 border-teal/30 bg-teal/20 flex items-center justify-center">
              <span className="text-teal text-lg font-medium">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </div>
        </div>

        {/* Admin Panel - Only visible to admin@gmail.com */}
        {userIsAdmin && (
          <section className="mb-8">
            <AdminPanel />
          </section>
        )}
        {/* Input Section */}
        <section className="mb-8" aria-label="URL input">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder={STRINGS.inputPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                  className="pl-10 h-12 text-base"
                  aria-label="Website URL"
                />
              </div>
              <Button 
                onClick={handleCheck} 
                disabled={isLoading}
                className="h-12 px-6 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {STRINGS.checking}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    {STRINGS.checkButton}
                  </>
                )}
              </Button>
            </div>
            
            {/* Options */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch 
                  checked={useApiMocks} 
                  onCheckedChange={setUseApiMocks}
                  aria-describedby="api-toggle-desc"
                />
                <span className="text-sm text-muted-foreground">{STRINGS.apiToggle}</span>
              </label>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRunDemo}
                disabled={isLoading}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {STRINGS.runDemo}
              </Button>
            </div>
          </div>
        </section>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-secondary animate-pulse" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Analyzing website safety...</p>
          </div>
        )}
        
        {/* Results Section */}
        {result && !isLoading && (
          <section className="space-y-6 animate-fade-up" aria-label="Safety results">
            {/* Main Result Card */}
            <div className={`rounded-2xl border p-6 ${verdictBgMap[result.verdict]}`}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreCircle score={result.score} verdict={result.verdict} />
                
                <div className="flex-1 text-center sm:text-left">
                  <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-semibold mb-2 ${verdictColorMap[result.verdict]}`}>
                    {result.verdictText}
                  </div>
                  
                  <p className="text-foreground font-medium mb-1">
                    {result.normalizedUrl}
                  </p>
                  
                  <p className="text-sm text-muted-foreground">
                    Checked {result.timestamp.toLocaleTimeString()}
                  </p>
                  
                  {result.corsBlocked && (
                    <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-card/50 text-sm">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{STRINGS.corsWarning}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyResult}
                  className="gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? STRINGS.copied : STRINGS.copyResult}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowWhy(!showWhy)}
                  className="gap-2"
                >
                  {showWhy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {STRINGS.whyTitle}
                </Button>
              </div>
            </div>
            
            {/* Signals Section */}
            {showWhy && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {STRINGS.whyTitle}
                </h2>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.signals.map((signal, index) => (
                    <SignalCard key={signal.id} signal={signal} index={index} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Suggestions Section */}
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                {STRINGS.suggestionsTitle}
              </h2>
              
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      result.verdict === "scam" ? "bg-danger-bg text-danger" :
                      result.verdict === "suspicious" ? "bg-suspicious-bg text-suspicious" :
                      "bg-safe-bg text-safe"
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
        
        {/* How to Run Section */}
        {!result && !isLoading && (
          <section className="mt-12 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">How it works</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Enter any website URL to analyze its safety. The checker performs multiple
                security checks and provides a risk score from 0 (safe) to 100 (dangerous).
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <h3 className="font-medium text-foreground mb-2">Client-side checks (no API)</h3>
                  <ul className="space-y-1 text-xs">
                    <li>• SSL/TLS verification</li>
                    <li>• URL pattern analysis</li>
                    <li>• Homograph attack detection</li>
                    <li>• Suspicious TLD detection</li>
                  </ul>
                </div>
                
                <div className="rounded-lg bg-secondary/50 p-4">
                  <h3 className="font-medium text-foreground mb-2">API-powered checks (mock)</h3>
                  <ul className="space-y-1 text-xs">
                    <li>• Google Safe Browsing</li>
                    <li>• WHOIS domain age</li>
                    <li>• VirusTotal blacklist</li>
                    <li>• Content analysis</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-xs bg-muted p-3 rounded-lg">
                <strong>To run locally:</strong> Open the HTML file in your browser, or use{" "}
                <code className="bg-background px-1 rounded">npx serve</code> for CORS testing.
              </p>
            </div>
          </section>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-teal-foreground/20 bg-teal-dark/50 mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-teal-foreground/70">
          Site Safety Checker • Educational tool • Does not guarantee site safety
        </div>
      </footer>
    </div>
  );
}
