import type { ButtonHTMLAttributes, ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-ink/15 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink/50";

export function Section({
  step,
  title,
  description,
  children,
  aside,
}: {
  step?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white/35 p-6 md:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          {step && <p className="eyebrow mb-2 text-muted">Step {step}</p>}
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" | "danger" }) {
  const styles = {
    solid: "bg-ink text-on-ink hover:bg-ink/85",
    ghost: "border border-ink/15 text-ink hover:border-ink/40",
    danger: "border border-red-700/30 text-red-800 hover:bg-red-700 hover:text-white",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-ink/15 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value ? "bg-ink text-on-ink" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Light/dark checkerboard so transparent images read as transparent. */
export const checkerStyle = {
  backgroundColor: "#f4f2ee",
  backgroundImage:
    "linear-gradient(45deg, #e3dfd8 25%, transparent 25%), linear-gradient(-45deg, #e3dfd8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e3dfd8 75%), linear-gradient(-45deg, transparent 75%, #e3dfd8 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
};
