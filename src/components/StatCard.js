import clsx from 'clsx';
import { Card } from './ui/Card';

export function StatCard({ label, value, sublabel, className }) {
  return (
    <Card className={clsx(className)}>
      <div className="p-5">
        <div className="kicker">{label}</div>
        <div className="mt-3 stat-num text-2xl font-semibold text-ink">{value}</div>
        {sublabel ? (
          <div className="mt-2 text-[11.69px] uppercase tracking-kicker text-mist">
            {sublabel}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
