/**
 * StatCard — reusable statistics display card.
 *
 * Single responsibility: render a labeled stat value with an icon and
 * optional color accent. Used by Director, Admin, and User dashboards.
 */

import type { LucideIcon } from 'lucide-react';

export type StatColor = 'primary' | 'warning' | 'accent' | 'success' | 'danger';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color?: StatColor;
  /** Use the large "gradient" variant (Director dashboard). */
  variant?: 'default' | 'gradient';
  /** Make the card clickable (used as a filter button). */
  active?: boolean;
  onClick?: () => void;
}

const iconClasses: Record<StatColor, string> = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
};

const gradientIconClasses: Record<StatColor, string> = {
  primary: 'bg-primary/20 text-primary',
  warning: 'bg-warning/20 text-warning',
  accent: 'bg-accent/20 text-accent',
  success: 'bg-success/20 text-success',
  danger: 'bg-danger/20 text-danger',
};

const gradientBgClasses: Record<StatColor, string> = {
  primary: 'stat-gradient-1',
  warning: 'stat-gradient-4',
  accent: 'stat-gradient-2',
  success: 'stat-gradient-3',
  danger: 'stat-gradient-4',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  color = 'primary',
  variant = 'default',
  active,
  onClick,
}: StatCardProps) {
  if (variant === 'gradient') {
    return (
      <div
        className={`card rounded-2xl p-3 sm:p-6 ${gradientBgClasses[color]} hover:scale-[1.02] transition-transform cursor-default`}
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div
            className={`w-9 h-9 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${gradientIconClasses[color]}`}
          >
            <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <p
              className="text-xl sm:text-3xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </p>
            <p
              className="text-[10px] sm:text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Clickable "pill" variant (Admin dashboard filter)
  if (onClick !== undefined) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all border ${
          active
            ? 'bg-primary text-white border-primary'
            : 'hover:border-primary/30'
        }`}
        style={
          !active
            ? {
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }
            : undefined
        }
      >
        <Icon
          className={`w-4 h-4 sm:w-5 sm:h-5 ${
            !active && color !== 'primary' ? iconClasses[color].split(' ').pop() : ''
          }`}
        />
        <div className="text-left">
          <p className="text-base sm:text-lg font-bold">{value}</p>
          <p
            className="text-[10px] sm:text-xs"
            style={{
              color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
            }}
          >
            {label}
          </p>
        </div>
      </button>
    );
  }

  // Default card variant
  return (
    <div
      className="rounded-xl p-3 sm:p-4 border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${iconClasses[color]}`}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <p
            className="text-lg sm:text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </p>
          <p
            className="text-[11px] sm:text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
