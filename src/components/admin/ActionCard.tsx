import Link from 'next/link';
import type { ReactNode } from 'react';

interface ActionCardProps {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  /** Cor do ícone e hover-border. Ex: "purple", "yellow". Se omitido, usa estilo neutro. */
  accent?: string;
  dataTour?: string;
  className?: string;
}

export default function ActionCard({ icon, label, href, onClick, badge, accent, dataTour, className = '' }: ActionCardProps) {
  const hasAccent = !!accent;

  const iconBg = hasAccent
    ? `bg-${accent}-500/10 group-hover:bg-${accent}-500/20`
    : 'bg-hover-bg group-hover:bg-hover-bg-strong';

  const hoverBorder = hasAccent
    ? `hover:border-${accent}-500/30`
    : 'hover:border-border-default';

  const baseClassName = `flex flex-col items-center justify-center gap-2 p-4 bg-elevated hover:bg-elevated-solid text-text-secondary border border-border-subtle rounded-2xl transition-all ${hoverBorder} hover:-translate-y-1 hover:shadow-md cursor-pointer relative group ${className}`;

  const content = (
    <>
      <div className={`p-2 rounded-full transition-colors ${iconBg}`}>
        {icon}
      </div>
      <span className="text-xs font-bold">{label}</span>
      {!!badge && badge > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-page">
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} data-tour={dataTour} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} data-tour={dataTour} className={baseClassName}>
      {content}
    </button>
  );
}
