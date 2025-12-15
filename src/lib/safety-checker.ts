/**
 * Site Safety Checker - Core Logic
 * 
 * This module contains all the safety checking algorithms and mock API functions.
 * 
 * SCORING WEIGHTS (total: 100 points max risk):
 * - SSL/TLS presence: 10 points
 * - Domain age: 15 points
 * - URL patterns: 20 points
 * - Blacklist status: 25 points
 * - Content analysis: 15 points
 * - Redirect behavior: 15 points
 */

// Localization strings for easy translation
export const STRINGS = {
  title: "Site Safety Checker",
  subtitle: "Verify if a website is safe before you visit",
  inputPlaceholder: "Enter website URL (e.g., example.com)",
  checkButton: "Check Safety",
  checking: "Analyzing...",
  safe: "Safe",
  likelySafe: "Likely Safe",
  suspicious: "Suspicious",
  scam: "Scam / Dangerous",
  whyTitle: "Why this rating?",
  suggestionsTitle: "What should you do?",
  copyResult: "Copy Result",
  copied: "Copied!",
  runDemo: "Run Demo Tests",
  apiToggle: "Show API Results (Mock)",
  corsWarning: "Some checks require a server-side proxy due to browser security (CORS).",
  signals: {
    ssl: "SSL/TLS Certificate",
    domainAge: "Domain Age",
    urlPatterns: "URL Patterns",
    blacklist: "Blacklist Status",
    content: "Content Analysis",
    redirect: "Redirect Behavior",
  },
};

export interface Signal {
  id: string;
  name: string;
  icon: string;
  status: "good" | "warning" | "bad" | "unknown";
  score: number;
  maxScore: number;
  explanation: string;
  tooltip: string;
  requiresApi?: boolean;
}

export interface CheckResult {
  url: string;
  normalizedUrl: string;
  score: number;
  verdict: "safe" | "likely-safe" | "suspicious" | "scam";
  verdictText: string;
  signals: Signal[];
  suggestions: string[];
  timestamp: Date;
  corsBlocked: boolean;
}

// ============================================
// URL VALIDATION AND NORMALIZATION
// ============================================

export function normalizeUrl(input: string): string {
  let url = input.trim().toLowerCase();
  
  // Remove any whitespace
  url = url.replace(/\s/g, '');
  
  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Remove trailing slash for consistency
  url = url.replace(/\/+$/, '');
  
  return url;
}

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(normalizeUrl(input));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname;
  } catch {
    return '';
  }
}

// ============================================
// CLIENT-SIDE CHECKS (No API Required)
// ============================================

// Suspicious TLDs commonly used in phishing
const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click', '.link', '.zip', '.mov'];

// Known safe TLDs
const TRUSTED_TLDS = ['.gov', '.edu', '.mil'];

// Common brand names to detect impersonation
const BRAND_PATTERNS = ['paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'netflix', 'bank', 'secure', 'login', 'account', 'verify', 'update'];

/**
 * Check URL patterns for suspicious characteristics
 * Weight: 20 points
 */
export function checkUrlPatterns(url: string): Signal {
  const normalized = normalizeUrl(url);
  const domain = extractDomain(url);
  let score = 0;
  const issues: string[] = [];
  
  // Check for IP address in hostname (suspicious)
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(domain)) {
    score += 5;
    issues.push("Uses IP address instead of domain name");
  }
  
  // Check for suspicious TLDs
  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld));
  if (hasSuspiciousTld) {
    score += 4;
    issues.push("Uses a TLD commonly associated with spam");
  }
  
  // Check for trusted TLDs (reduce score)
  const hasTrustedTld = TRUSTED_TLDS.some(tld => domain.endsWith(tld));
  if (hasTrustedTld) {
    score = Math.max(0, score - 5);
  }
  
  // Check for excessive subdomains (more than 3)
  const subdomainCount = domain.split('.').length - 2;
  if (subdomainCount > 3) {
    score += 3;
    issues.push("Unusually many subdomains");
  }
  
  // Check for very long domain names
  if (domain.length > 50) {
    score += 2;
    issues.push("Unusually long domain name");
  }
  
  // Check for hyphens (common in phishing)
  const hyphenCount = (domain.match(/-/g) || []).length;
  if (hyphenCount > 2) {
    score += 3;
    issues.push("Multiple hyphens in domain");
  }
  
  // Check for brand impersonation patterns
  const hasBrandPattern = BRAND_PATTERNS.some(brand => {
    const brandInDomain = domain.includes(brand);
    const isOfficialDomain = domain === `${brand}.com` || domain === `www.${brand}.com`;
    return brandInDomain && !isOfficialDomain;
  });
  if (hasBrandPattern) {
    score += 5;
    issues.push("May be impersonating a known brand");
  }
  
  // Check for many query parameters
  try {
    const parsed = new URL(normalized);
    if (parsed.searchParams.toString().length > 200) {
      score += 2;
      issues.push("Unusually complex URL parameters");
    }
  } catch {}
  
  const status = score === 0 ? "good" : score < 5 ? "warning" : "bad";
  
  return {
    id: "url-patterns",
    name: STRINGS.signals.urlPatterns,
    icon: "link",
    status,
    score: Math.min(score, 20),
    maxScore: 20,
    explanation: issues.length > 0 ? issues.join(". ") : "URL structure appears normal",
    tooltip: "Checks for suspicious patterns in the URL like unusual TLDs, IP addresses, or brand impersonation attempts.",
  };
}

/**
 * Check for punycode/IDN homograph attacks
 * Weight: Part of URL patterns
 */
export function checkHomographAttack(url: string): { isHomograph: boolean; explanation: string } {
  const domain = extractDomain(url);
  
  // Check if domain contains punycode (starts with xn--)
  if (domain.includes('xn--')) {
    return {
      isHomograph: true,
      explanation: "Domain uses internationalized characters (punycode) which may be used to impersonate legitimate sites",
    };
  }
  
  // Check for lookalike characters (simplified)
  const lookalikes: Record<string, string[]> = {
    'o': ['0', 'ο', 'о'],
    'l': ['1', 'і', 'ӏ'],
    'a': ['а', 'ɑ'],
    'e': ['е', 'ё'],
  };
  
  // This is a simplified check - real implementation would be more comprehensive
  for (const [char, fakes] of Object.entries(lookalikes)) {
    for (const fake of fakes) {
      if (domain.includes(fake)) {
        return {
          isHomograph: true,
          explanation: `Domain may contain lookalike characters designed to impersonate legitimate sites`,
        };
      }
    }
  }
  
  return {
    isHomograph: false,
    explanation: "No homograph attack detected",
  };
}

/**
 * Check SSL/TLS presence
 * Weight: 10 points
 */
export function checkSsl(url: string): Signal {
  const normalized = normalizeUrl(url);
  const hasHttps = normalized.startsWith('https://');
  
  return {
    id: "ssl",
    name: STRINGS.signals.ssl,
    icon: hasHttps ? "lock" : "unlock",
    status: hasHttps ? "good" : "bad",
    score: hasHttps ? 0 : 10,
    maxScore: 10,
    explanation: hasHttps 
      ? "Site uses HTTPS encryption" 
      : "Site does not use HTTPS - your connection is not encrypted",
    tooltip: "HTTPS encrypts data between your browser and the website, protecting sensitive information.",
  };
}

// ============================================
// MOCK API FUNCTIONS (Require API Keys)
// ============================================

/**
 * Mock Google Safe Browsing API lookup
 * 
 * TODO: Replace with actual API call
 * API Documentation: https://developers.google.com/safe-browsing/v4/lookup-api
 * 
 * Expected request:
 * POST https://safebrowsing.googleapis.com/v4/threatMatches:find?key=YOUR_API_KEY
 * {
 *   "client": { "clientId": "your-app", "clientVersion": "1.0.0" },
 *   "threatInfo": {
 *     "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
 *     "platformTypes": ["ANY_PLATFORM"],
 *     "threatEntryTypes": ["URL"],
 *     "threatEntries": [{ "url": "https://example.com" }]
 *   }
 * }
 */
export async function safeBrowsingLookup(url: string, apiKey?: string): Promise<Signal> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock responses based on test URLs
  const domain = extractDomain(url);
  let isThreat = false;
  let threatType = "";
  
  // Simulate threat detection for demo
  if (domain.includes('phishing') || domain.includes('malware')) {
    isThreat = true;
    threatType = "SOCIAL_ENGINEERING";
  }
  
  return {
    id: "safe-browsing",
    name: "Google Safe Browsing",
    icon: "shield",
    status: isThreat ? "bad" : "good",
    score: isThreat ? 25 : 0,
    maxScore: 25,
    explanation: isThreat 
      ? `Flagged as ${threatType} by Google Safe Browsing` 
      : "Not found in Google Safe Browsing threat database",
    tooltip: "Google Safe Browsing checks URLs against databases of known phishing, malware, and unwanted software.",
    requiresApi: true,
  };
}

/**
 * Mock WHOIS / Domain Age lookup
 * 
 * TODO: Replace with actual WHOIS API
 * Options: WhoisXML API, DomainTools, or self-hosted WHOIS
 * 
 * Expected response shape:
 * {
 *   "domainName": "example.com",
 *   "createdDate": "1995-08-14T00:00:00Z",
 *   "updatedDate": "2023-01-01T00:00:00Z",
 *   "expiresDate": "2025-08-14T00:00:00Z",
 *   "registrar": "Example Registrar Inc."
 * }
 */
export async function whoisLookup(domain: string, apiKey?: string): Promise<{ signal: Signal; ageYears: number | null }> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Mock domain ages for demos
  const mockAges: Record<string, number> = {
    'google.com': 26,
    'amazon.com': 28,
    'microsoft.com': 32,
    'facebook.com': 20,
  };
  
  // Generate a random age for unknown domains (biased towards newer for suspicious ones)
  let ageYears: number | null = mockAges[domain] || null;
  
  if (ageYears === null) {
    // Simulate: suspicious domains tend to be newer
    if (domain.includes('secure') || domain.includes('login') || domain.includes('verify')) {
      ageYears = Math.random() * 2; // 0-2 years
    } else {
      ageYears = Math.random() * 10 + 1; // 1-11 years
    }
  }
  
  // Score: younger domains are riskier
  // 0-6 months: 15 points
  // 6-12 months: 10 points
  // 1-2 years: 5 points
  // 2+ years: 0 points
  let score = 0;
  let status: "good" | "warning" | "bad" = "good";
  
  if (ageYears < 0.5) {
    score = 15;
    status = "bad";
  } else if (ageYears < 1) {
    score = 10;
    status = "warning";
  } else if (ageYears < 2) {
    score = 5;
    status = "warning";
  }
  
  return {
    signal: {
      id: "domain-age",
      name: STRINGS.signals.domainAge,
      icon: "calendar",
      status,
      score,
      maxScore: 15,
      explanation: ageYears !== null 
        ? `Domain registered ${ageYears.toFixed(1)} years ago` 
        : "Unable to determine domain age",
      tooltip: "Newer domains are more likely to be used for scams. Established domains with years of history are generally more trustworthy.",
      requiresApi: true,
    },
    ageYears,
  };
}

/**
 * Mock VirusTotal / PhishTank lookup
 * 
 * TODO: Replace with actual API
 * VirusTotal API: https://developers.virustotal.com/reference
 * PhishTank API: https://phishtank.org/api_info.php
 */
export async function blacklistLookup(url: string, apiKey?: string): Promise<Signal> {
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const domain = extractDomain(url);
  
  // Mock detection for demo URLs
  let detections = 0;
  let totalEngines = 70;
  
  if (domain.includes('malware') || domain.includes('phishing')) {
    detections = Math.floor(Math.random() * 30) + 20; // 20-50 detections
  } else if (domain.includes('suspicious')) {
    detections = Math.floor(Math.random() * 10) + 2; // 2-12 detections
  }
  
  const score = detections > 10 ? 25 : detections > 3 ? 15 : detections > 0 ? 5 : 0;
  const status = detections > 10 ? "bad" : detections > 0 ? "warning" : "good";
  
  return {
    id: "blacklist",
    name: STRINGS.signals.blacklist,
    icon: "database",
    status,
    score,
    maxScore: 25,
    explanation: detections > 0 
      ? `Flagged by ${detections}/${totalEngines} security vendors` 
      : "Not found in any security blacklists",
    tooltip: "Aggregated results from multiple security vendors including antivirus companies and threat intelligence feeds.",
    requiresApi: true,
  };
}

// ============================================
// CONTENT ANALYSIS (Requires Server-Side Fetch)
// ============================================

/**
 * Attempt to analyze page content
 * Note: This often fails due to CORS - a server-side proxy is needed
 */
export async function analyzeContent(url: string): Promise<{ signal: Signal; corsBlocked: boolean }> {
  try {
    // Try to fetch the page (will likely fail due to CORS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(normalizeUrl(url), {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // If we get here, we can at least check the response
    const isHtml = response.headers.get('content-type')?.includes('text/html');
    
    return {
      signal: {
        id: "content",
        name: STRINGS.signals.content,
        icon: "file-text",
        status: "good",
        score: 0,
        maxScore: 15,
        explanation: isHtml ? "Site content appears to be standard HTML" : "Unable to determine content type",
        tooltip: "Analyzes page content for login forms, credential collection, and suspicious scripts.",
      },
      corsBlocked: false,
    };
  } catch {
    // CORS blocked or network error
    return {
      signal: {
        id: "content",
        name: STRINGS.signals.content,
        icon: "file-text",
        status: "unknown",
        score: 0,
        maxScore: 15,
        explanation: "Content analysis requires server-side fetch (CORS blocked)",
        tooltip: "A server-side proxy is needed to fully analyze page content for credential forms and suspicious patterns.",
      },
      corsBlocked: true,
    };
  }
}

/**
 * Check redirect behavior
 */
export async function checkRedirects(url: string): Promise<Signal> {
  // In browser, we can't fully track redirects due to CORS
  // This would need a server-side check
  
  return {
    id: "redirect",
    name: STRINGS.signals.redirect,
    icon: "arrow-right",
    status: "unknown",
    score: 0,
    maxScore: 15,
    explanation: "Redirect analysis requires server-side fetch",
    tooltip: "Checks if the site redirects to unexpected domains, which is common in phishing attacks.",
    requiresApi: true,
  };
}

// ============================================
// MAIN CHECKER FUNCTION
// ============================================

export async function checkSiteSafety(url: string, useApiMocks: boolean = false): Promise<CheckResult> {
  const normalizedUrl = normalizeUrl(url);
  const domain = extractDomain(url);
  
  // Run all checks
  const [
    sslSignal,
    urlPatternsSignal,
    contentResult,
    redirectSignal,
    safeBrowsingSignal,
    whoisResult,
    blacklistSignal,
  ] = await Promise.all([
    Promise.resolve(checkSsl(url)),
    Promise.resolve(checkUrlPatterns(url)),
    analyzeContent(url),
    checkRedirects(url),
    useApiMocks ? safeBrowsingLookup(url) : Promise.resolve(null),
    useApiMocks ? whoisLookup(domain) : Promise.resolve(null),
    useApiMocks ? blacklistLookup(url) : Promise.resolve(null),
  ]);
  
  // Check for homograph attacks
  const homographCheck = checkHomographAttack(url);
  if (homographCheck.isHomograph) {
    urlPatternsSignal.score = Math.min(urlPatternsSignal.score + 8, 20);
    urlPatternsSignal.status = "bad";
    urlPatternsSignal.explanation += `. ${homographCheck.explanation}`;
  }
  
  // Collect all signals
  const signals: Signal[] = [
    sslSignal,
    urlPatternsSignal,
  ];
  
  // Add API signals if available
  if (whoisResult) {
    signals.push(whoisResult.signal);
  }
  
  if (safeBrowsingSignal) {
    signals.push(safeBrowsingSignal);
  }
  
  if (blacklistSignal) {
    signals.push(blacklistSignal);
  }
  
  signals.push(contentResult.signal);
  signals.push(redirectSignal);
  
  // Calculate total score
  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
  
  // Determine verdict
  let verdict: CheckResult["verdict"];
  let verdictText: string;
  
  if (totalScore <= 10) {
    verdict = "safe";
    verdictText = STRINGS.safe;
  } else if (totalScore <= 30) {
    verdict = "likely-safe";
    verdictText = STRINGS.likelySafe;
  } else if (totalScore <= 60) {
    verdict = "suspicious";
    verdictText = STRINGS.suspicious;
  } else {
    verdict = "scam";
    verdictText = STRINGS.scam;
  }
  
  // Generate suggestions based on verdict
  const suggestions = generateSuggestions(verdict, signals);
  
  return {
    url,
    normalizedUrl,
    score: Math.min(totalScore, 100),
    verdict,
    verdictText,
    signals: signals.slice(0, 6), // Top 6 signals
    suggestions,
    timestamp: new Date(),
    corsBlocked: contentResult.corsBlocked,
  };
}

function generateSuggestions(verdict: CheckResult["verdict"], signals: Signal[]): string[] {
  const suggestions: string[] = [];
  
  switch (verdict) {
    case "safe":
      suggestions.push("This site appears safe to visit");
      suggestions.push("Always verify you're on the correct URL before entering sensitive information");
      break;
    case "likely-safe":
      suggestions.push("Proceed with normal caution");
      suggestions.push("Verify the URL matches what you expected");
      suggestions.push("Look for the padlock icon in your browser's address bar");
      break;
    case "suspicious":
      suggestions.push("Be cautious - avoid entering personal or financial information");
      suggestions.push("Verify this is the official site through a trusted source");
      suggestions.push("Consider using a password manager to avoid phishing");
      suggestions.push("Report this site if you believe it's fraudulent");
      break;
    case "scam":
      suggestions.push("Do NOT enter any personal information on this site");
      suggestions.push("Leave this site immediately");
      suggestions.push("If you entered credentials, change your passwords immediately");
      suggestions.push("Report this site to your bank if financial information was involved");
      suggestions.push("Report to Google Safe Browsing: safebrowsing.google.com/safebrowsing/report_phish/");
      break;
  }
  
  // Add specific suggestions based on signals
  const sslSignal = signals.find(s => s.id === "ssl");
  if (sslSignal?.status === "bad") {
    suggestions.push("Never enter passwords or credit card info on non-HTTPS sites");
  }
  
  return suggestions;
}

// ============================================
// TEST URLS FOR DEMO
// ============================================

export const TEST_URLS = [
  { url: "https://google.com", expectedVerdict: "safe", description: "Major trusted site" },
  { url: "https://amazon.com", expectedVerdict: "safe", description: "Major e-commerce site" },
  { url: "http://192.168.1.1/login", expectedVerdict: "suspicious", description: "IP address in URL" },
  { url: "https://g00gle-secure-login.tk", expectedVerdict: "scam", description: "Brand impersonation + suspicious TLD" },
  { url: "https://paypal-verify-account.xyz/update", expectedVerdict: "scam", description: "Phishing attempt pattern" },
  { url: "https://my-small-business.com", expectedVerdict: "likely-safe", description: "Normal small business site" },
];

// ============================================
// SERVER-SIDE PROXY EXAMPLE (for reference)
// ============================================

/**
 * Example Node.js/Express server code for CORS-free fetching:
 * 
 * ```javascript
 * const express = require('express');
 * const fetch = require('node-fetch');
 * const app = express();
 * 
 * app.use(express.json());
 * 
 * // Proxy endpoint for fetching external URLs
 * app.post('/api/fetch-site', async (req, res) => {
 *   try {
 *     const { url } = req.body;
 *     const response = await fetch(url, {
 *       headers: { 'User-Agent': 'SiteSafetyChecker/1.0' },
 *       redirect: 'follow',
 *       timeout: 10000,
 *     });
 *     
 *     res.json({
 *       status: response.status,
 *       redirected: response.redirected,
 *       finalUrl: response.url,
 *       contentType: response.headers.get('content-type'),
 *     });
 *   } catch (error) {
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 * 
 * // Google Safe Browsing API proxy
 * app.post('/api/safe-browsing', async (req, res) => {
 *   const { url } = req.body;
 *   const API_KEY = process.env.GOOGLE_SAFE_BROWSING_KEY;
 *   
 *   const response = await fetch(
 *     `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${API_KEY}`,
 *     {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         client: { clientId: 'site-safety-checker', clientVersion: '1.0' },
 *         threatInfo: {
 *           threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
 *           platformTypes: ['ANY_PLATFORM'],
 *           threatEntryTypes: ['URL'],
 *           threatEntries: [{ url }],
 *         },
 *       }),
 *     }
 *   );
 *   
 *   res.json(await response.json());
 * });
 * 
 * app.listen(3000);
 * ```
 */
