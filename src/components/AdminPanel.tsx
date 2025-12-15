import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Download, 
  ShieldCheck,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getSignInLogs, 
  clearAllLogs, 
  exportLogsAsJSON, 
  calculateDuration,
  type SignInLog 
} from "@/lib/auth-storage";
import { toast } from "@/hooks/use-toast";

export function AdminPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<SignInLog[]>(getSignInLogs());

  const handleClearLogs = () => {
    clearAllLogs();
    setLogs([]);
    toast({
      title: "Logs cleared",
      description: "All sign-in/sign-out logs have been deleted.",
    });
  };

  const handleExportLogs = () => {
    exportLogsAsJSON();
    toast({
      title: "Logs exported",
      description: "JSON file has been downloaded.",
    });
  };

  const refreshLogs = () => {
    setLogs(getSignInLogs());
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-lg animate-fade-in">
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) refreshLogs();
        }}
        className="w-full flex items-center justify-between p-4 text-foreground hover:bg-secondary/50 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-teal" />
          Admin Panel
        </span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Total sessions: <strong className="text-foreground">{logs.length}</strong>
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLogs}
              className="gap-2"
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export Logs (JSON)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              className="gap-2 text-destructive hover:text-destructive"
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Clear All Logs
            </Button>
          </div>

          {/* Logs Table */}
          {logs.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Sign-in Time</TableHead>
                      <TableHead>Sign-out Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{log.name}</TableCell>
                        <TableCell className="text-muted-foreground">{log.email}</TableCell>
                        <TableCell className="text-sm">{log.signInTime}</TableCell>
                        <TableCell className="text-sm">
                          {log.signOutTime || (
                            <span className="text-safe font-medium">Active</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {calculateDuration(log.signInTime, log.signOutTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sign-in logs recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
