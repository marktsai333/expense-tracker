import { formatDateDisplay } from "../lib/format";

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full">
      <span
        className="block w-full rounded-2xl px-3.5 py-3.5 text-base truncate"
        style={{ background: "var(--input-bg)", color: "var(--text)" }}
      >
        {formatDateDisplay(value)}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="absolute inset-0 w-full h-full opacity-0 border-0 p-0 m-0"
      />
    </div>
  );
}
