type IconProps = { active?: boolean };

const common = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconOverview({ active }: IconProps) {
  return (
    <svg {...common} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}>
      <rect x="2.5" y="6" width="19" height="12" rx="2.2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M5.5 9v.01M18.5 15v.01" />
    </svg>
  );
}

export function IconAccounts({ active }: IconProps) {
  return (
    <svg {...common} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}>
      <path d="M12 2.5 21.5 8H2.5L12 2.5Z" />
      <path d="M4 8v10M9 8v10M15 8v10M20 8v10" />
      <path d="M2.5 21h19" />
    </svg>
  );
}

export function IconAnalysis(_props: IconProps) {
  return (
    <svg {...common}>
      <path d="M4 20V11M11 20V4M18 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

export function IconList({ active }: IconProps) {
  return (
    <svg {...common} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}>
      <path d="M5 3.5h11l3 3V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </svg>
  );
}

export function IconMe({ active }: IconProps) {
  return (
    <svg {...common} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.12 : 0}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.3-3.8 4.2-5.8 7.5-5.8s6.2 2 7.5 5.8" />
    </svg>
  );
}
