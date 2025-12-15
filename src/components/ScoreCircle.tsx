import { useEffect, useState } from "react";

interface ScoreCircleProps {
  score: number;
  verdict: "safe" | "likely-safe" | "suspicious" | "scam";
  size?: number;
}

export function ScoreCircle({ score, verdict, size = 160 }: ScoreCircleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(score * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);
  
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (100 - score) / 100;
  const strokeDashoffset = circumference * (1 - progress);
  
  const colorMap = {
    safe: "stroke-safe",
    "likely-safe": "stroke-likely-safe",
    suspicious: "stroke-suspicious",
    scam: "stroke-danger",
  };
  
  const bgColorMap = {
    safe: "text-safe",
    "likely-safe": "text-likely-safe",
    suspicious: "text-suspicious",
    scam: "text-danger",
  };
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${colorMap[verdict]} animate-score-fill transition-all duration-1000`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${bgColorMap[verdict]}`}>
          {animatedScore}
        </span>
        <span className="text-sm text-muted-foreground">Risk Score</span>
      </div>
    </div>
  );
}
