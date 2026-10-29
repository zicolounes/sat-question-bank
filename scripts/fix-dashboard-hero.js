const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/dashboard/DashboardHero.js');
const d = 'div';
const open = (cls) => `<${d} className="${cls}">`;
const close = `</${d}>`;
const self = (cls) => `<${d} className="${cls}" />`;

const aside = `        <aside className="lg:pt-5 lg:self-stretch">
          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">
            ${open('grid grid-cols-2 gap-3 sm:gap-4')}
              ${open('rounded-sm bg-accent/[0.07] px-3 py-3 ring-1 ring-accent/[0.14]')}
                ${open('kicker text-accent')}Today${close}
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-24" />
                ) : (
                  ${open('mt-2 flex items-baseline gap-1.5')}
                    <span className="stat-num text-2xl font-semibold text-accent sm:text-3xl">{completed}</span>
                    <span className="text-xs text-mist tabular-nums">/ {goal}</span>
                  ${close}
                )}
                {!loading ? (
                  ${open('mt-2 h-1 w-full overflow-hidden rounded-sm bg-accent/[0.12]')}
                    <${d}
                      className="h-1 rounded-sm bg-accent"
                      style={{ width: \`\${pct}%\`, minWidth: pct > 0 ? 2 : 0 }}
                    />
                  ${close}
                ) : null}
                ${open('mt-1.5 text-[11px] tabular-nums text-mist')}
                  {loading ? '—' : \`\${pct}% · \${leftToday} left\`}
                ${close}
              ${close}

              ${open('rounded-sm bg-jade/[0.06] px-3 py-3 ring-1 ring-jade/[0.12]')}
                ${open('kicker text-jade')}Streak${close}
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-20" />
                ) : (
                  ${open('mt-2 flex items-baseline gap-1.5')}
                    <span
                      className={clsx(
                        'stat-num text-2xl font-semibold sm:text-3xl',
                        data.currentStreak > 0 ? 'text-jade' : 'text-ink'
                      )}
                    >
                      {data.currentStreak}
                    </span>
                    <span className="text-xs text-mist">
                      day{data.currentStreak === 1 ? '' : 's'}
                    </span>
                  ${close}
                )}
                ${open('mt-1.5 text-[11px] text-mist')}
                  Best · {loading ? '—' : data.longestStreak}
                ${close}
              ${close}

              ${open('rounded-sm bg-paper px-3 py-3 ring-1 ring-rule/80')}
                ${open('kicker')}Today acc${close}
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  ${open('mt-2 flex items-baseline gap-1')}
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(todayAcc))}>
                      {todayAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  ${close}
                )}
                ${open('mt-1.5 text-[11px] text-mist')}
                  This session
                ${close}
              ${close}

              ${open('rounded-sm bg-paper px-3 py-3 ring-1 ring-rule/80')}
                ${open('kicker')}Week acc${close}
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  ${open('mt-2 flex items-baseline gap-1')}
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(weekAcc))}>
                      {weekAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  ${close}
                )}
                ${open('mt-1.5 text-[11px] text-mist')}
                  Last 7 days
                ${close}
              ${close}
            ${close}

            ${open('mt-5 border-t border-accent/[0.12] pt-5')}
              ${open('kicker text-accent')}Today&apos;s mix${close}
              <p className="mt-1 text-[12.75px] leading-snug text-mist">
                Spread reps across Math, R&amp;W, and mixed sets.
              </p>
              ${open('mt-4 space-y-4')}
                <DailyMixRow
                  label="Math"
                  done={progressToday.math}
                  target={mixMath}
                  loading={loading}
                  tone="math"
                />
                <DailyMixRow
                  label="R&W"
                  done={progressToday.readingWriting}
                  target={mixRw}
                  loading={loading}
                  tone="rw"
                />
                <DailyMixRow
                  label="Mixed"
                  done={progressToday.mixed}
                  target={mixMixed}
                  loading={loading}
                  tone="mixed"
                />
              ${close}
            ${close}

            {!loading && leftToday > 0 ? (
              <p className="mt-3 rounded-sm bg-accent/[0.05] px-3 py-2 text-[12.75px] leading-snug text-mist ring-1 ring-accent/[0.1]">
                <span className="font-semibold text-accent">{leftToday}</span> more unique{' '}
                {leftToday === 1 ? 'question' : 'questions'} to hit today&apos;s goal.
              </p>
            ) : !loading && completed >= goal ? (
              <p className="mt-3 text-[12.75px] font-medium text-jade">Today&apos;s goal complete — nice work.</p>
            ) : null}
          </Card>
        </aside>`;

let src = fs.readFileSync(file, 'utf8');
const asideFixed = aside;
const start = src.indexOf('        <aside className="lg:pt-5 lg:self-stretch">');
const end = src.indexOf('        </aside>', start);
if (start === -1 || end === -1) {
  console.error('Could not find aside block');
  process.exit(1);
}
const endLine = end + '        </aside>'.length;
src = src.slice(0, start) + asideFixed + src.slice(endLine);
fs.writeFileSync(file, src);
console.log('DashboardHero.js aside block replaced.');
