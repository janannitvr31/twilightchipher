import { 
  Lock, 
  Unlock, 
  Link, 
  Calendar, 
  Shield, 
  Database, 
  FileText, 
  ArrowRight,
  HelpCircle 
} from "lucide-react";
import type { Signal } from "@/lib/safety-checker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  lock: Lock,
  unlock: Unlock,
  link: Link,
  calendar: Calendar,
  shield: Shield,
  database: Database,
  "file-text": FileText,
  "arrow-right": ArrowRight,
};

interface SignalCardProps {
  signal: Signal;
  index: number;
}

export function SignalCard({ signal, index }: SignalCardProps) {
  const Icon = iconMap[signal.icon] || HelpCircle;
  
  const statusStyles = {
    good: "bg-safe-bg text-safe border-safe/20",
    warning: "bg-suspicious-bg text-suspicious border-suspicious/20",
    bad: "bg-danger-bg text-danger border-danger/20",
    unknown: "bg-muted text-muted-foreground border-border",
  };
  
  const statusIconBg = {
    good: "bg-safe/10",
    warning: "bg-suspicious/10",
    bad: "bg-danger/10",
    unknown: "bg-muted",
  };
  
  return (
    <div 
      className="animate-fade-up rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${statusIconBg[signal.status]}`}>
          <Icon className={`h-5 w-5 ${
            signal.status === "good" ? "text-safe" :
            signal.status === "warning" ? "text-suspicious" :
            signal.status === "bad" ? "text-danger" :
            "text-muted-foreground"
          }`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground truncate">{signal.name}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{signal.tooltip}</p>
              </TooltipContent>
            </Tooltip>
            {signal.requiresApi && (
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                API
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {signal.explanation}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[signal.status]}`}>
              {signal.status === "good" ? "Pass" : 
               signal.status === "warning" ? "Warning" : 
               signal.status === "bad" ? "Fail" : "Unknown"}
            </div>
            <span className="text-xs text-muted-foreground">
              +{signal.score} / {signal.maxScore} risk points
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
