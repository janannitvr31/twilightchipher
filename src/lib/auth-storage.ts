// Authentication storage utilities for sign-in/sign-out history

export interface SignInLog {
  name: string;
  email: string;
  signInTime: string;
  signOutTime: string | null;
}

export interface CurrentUser {
  name: string;
  email: string;
  picture: string;
  signInTime: string;
}

const SIGN_IN_LOGS_KEY = "signInLogs";
const CURRENT_USER_KEY = "currentUser";

// Get all sign-in logs
export function getSignInLogs(): SignInLog[] {
  try {
    const stored = localStorage.getItem(SIGN_IN_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save sign-in logs
export function saveSignInLogs(logs: SignInLog[]): void {
  localStorage.setItem(SIGN_IN_LOGS_KEY, JSON.stringify(logs));
}

// Record a new sign-in
export function recordSignIn(name: string, email: string): void {
  const logs = getSignInLogs();
  const newLog: SignInLog = {
    name,
    email,
    signInTime: new Date().toLocaleString(),
    signOutTime: null,
  };
  logs.unshift(newLog);
  saveSignInLogs(logs);
}

// Record sign-out for the most recent session of a user
export function recordSignOut(email: string): void {
  const logs = getSignInLogs();
  const userLogIndex = logs.findIndex(
    (log) => log.email === email && log.signOutTime === null
  );
  
  if (userLogIndex !== -1) {
    logs[userLogIndex].signOutTime = new Date().toLocaleString();
    saveSignInLogs(logs);
  }
}

// Clear all logs
export function clearAllLogs(): void {
  localStorage.removeItem(SIGN_IN_LOGS_KEY);
}

// Get current user
export function getCurrentUser(): CurrentUser | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Set current user
export function setCurrentUser(user: CurrentUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Calculate duration between sign-in and sign-out
export function calculateDuration(signInTime: string, signOutTime: string | null): string {
  if (!signOutTime) return "Active";
  
  try {
    const signIn = new Date(signInTime);
    const signOut = new Date(signOutTime);
    const diffMs = signOut.getTime() - signIn.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  } catch {
    return "N/A";
  }
}

// Check if user is admin
export function isAdmin(email: string): boolean {
  return email === "admin@gmail.com";
}

// Export logs as JSON file
export function exportLogsAsJSON(): void {
  const logs = getSignInLogs();
  const dataStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `sign-in-logs-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
