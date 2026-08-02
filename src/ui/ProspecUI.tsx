import type { ReactNode } from "react";

export type ProspecTone =
  | "orange"
  | "green"
  | "blue"
  | "purple"
  | "red"
  | "gold"
  | "neutral";

export function ProspecPage({ children }: { children: ReactNode }) {
  return <div className="prospec-page">{children}</div>;
}

export function ProspecSection({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="prospec-section">
      {title || subtitle || action ? (
        <div className="prospec-section__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div className="prospec-section__action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ProspecCard({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`prospec-card${interactive ? " is-interactive" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function ProspecMetric({
  label,
  value,
  detail,
  tone = "orange",
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: ProspecTone;
  icon?: ReactNode;
}) {
  return (
    <ProspecCard className={`prospec-metric tone-${tone}`}>
      <div className="prospec-metric__top">
        {icon ? <span className="prospec-metric__icon">{icon}</span> : null}
        <span className="prospec-metric__label">{label}</span>
      </div>
      <strong className="prospec-metric__value">{value}</strong>
      {detail ? <span className="prospec-metric__detail">{detail}</span> : null}
    </ProspecCard>
  );
}

export function ProspecBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ProspecTone;
}) {
  return <span className={`prospec-badge tone-${tone}`}>{children}</span>;
}

export function ProspecButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
}) {
  return (
    <button className={`prospec-button ${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function ProspecTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: string; label: string; badge?: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="prospec-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          className={item.value === value ? "active" : ""}
          onClick={() => onChange(item.value)}
          role="tab"
          aria-selected={item.value === value}
        >
          <span>{item.label}</span>
          {item.badge ? <b>{item.badge}</b> : null}
        </button>
      ))}
    </div>
  );
}

export function ProspecAvatar({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: ProspecTone;
}) {
  return <span className={`prospec-avatar tone-${tone}`}>{children}</span>;
}
