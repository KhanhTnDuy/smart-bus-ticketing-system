import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  action,
  icon,
}) => {
  return (
    <div className="mb-6">
      {/* Breadcrumb if any */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              {b.href ? (
                <a
                  href={b.href}
                  className="hover:text-institutional-600 dark:hover:text-sky-400 transition-colors"
                >
                  {b.label}
                </a>
              ) : (
                <span className="text-slate-700 dark:text-slate-300 font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main heading row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-lg bg-institutional-50 dark:bg-[#1a2b53] text-institutional-600 dark:text-sky-400 border border-institutional-200 dark:border-institutional-800">
                {icon}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-institutional-800 dark:text-sky-400 uppercase">
              {title}
            </h1>
          </div>
          {/* Institutional gold/yellow accent line */}
          <div className="h-0.5 bg-amber-500 dark:bg-yellow-400 w-24 my-2.5 rounded-full" />
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Button on Right (e.g. + Thêm ...) */}
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
};
