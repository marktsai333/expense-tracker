import { motion } from "motion/react";

export function ProgressRing({
  percent,
  color,
  size = 64,
  strokeWidth = 7,
  label,
}: {
  percent: number; // 0-100
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--input-bg)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: "var(--text)" }}>
          {label}
        </div>
      )}
    </div>
  );
}
