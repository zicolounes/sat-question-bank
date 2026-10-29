const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../src/components/dashboard/DashboardHero.js');
let s = fs.readFileSync(p, 'utf8');

const start = s.indexOf('          <Card className="flex h-full flex-col border');
const end = s.indexOf('          </Card>', start);
if (start === -1 || end === -1) {
  console.error('markers not found');
  process.exit(1);
}

const cardInner = `          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-24" />
                ) : (
                  <motionless />
                    <span className="stat-num text-2xl font-semibold text-accent sm:text-3xl">{completed}</span>
                    <span className="text-xs text-mist tabular-nums">/ {goal}</span>
                  </motionless>
                )}
                {!loading ? (
                  <motionless />
                    <motionless />
                      className="h-1 rounded-sm bg-accent"
                      style={{ width: \`\${pct}%\`, minWidth: pct > 0 ? 2 : 0 }}
                    />
                  </motionless>
                ) : null}
                <motionless />
                  {loading ? '—' : \`\${pct}% · \${leftToday} left\`}
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-20" />
                ) : (
                  <motionless />
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
                  </motionless>
                )}
                <motionless />
                  Best · {loading ? '—' : data.longestStreak}
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <motionless />
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(todayAcc))}>
                      {todayAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </motionless>
                )}
                <motionless />
                  This session
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <motionless />
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(weekAcc))}>
                      {weekAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </motionless>
                )}
                <motionless />
                  Last 7 days
                </motionless>
              </motionless>
            </motionless>

            <motionless />
              <motionless />
              <p className="mt-1 text-[12.75px] leading-snug text-mist">
                Spread reps across Math, R&amp;W, and mixed sets.
              </p>
              <motionless />
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
              </motionless>
            </motionless>

            {!loading && leftToday > 0 ? (
              <p className="mt-3 rounded-sm bg-accent/[0.05] px-3 py-2 text-[12.75px] leading-snug text-mist ring-1 ring-accent/[0.1]">
                <span className="font-semibold text-accent">{leftToday}</span> more unique{' '}
                {leftToday === 1 ? 'question' : 'questions'} to hit today&apos;s goal.
              </p>
            ) : !loading && completed >= goal ? (
              <p className="mt-3 text-[12.75px] font-medium text-jade">Today&apos;s goal complete — nice work.</p>
            ) : null}
          </Card>`;

const fixed = cardInner.split('motionless').join('div')
  .replace(
    '<div className="kicker text-accent">Today</div>',
    `<div className="rounded-sm bg-accent/[0.07] px-3 py-3 ring-1 ring-accent/[0.14]">
                <motionless />`.split('motionless').join('motionless')
  );

// rebuild cardInner properly without the broken replace above
const d = 'motionless';
const tag = 'div';
const neu = `          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">
            <motionless />
              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-24" />
                ) : (
                  <motionless />
                    <span className="stat-num text-2xl font-semibold text-accent sm:text-3xl">{completed}</span>
                    <span className="text-xs text-mist tabular-nums">/ {goal}</span>
                  </motionless>
                )}
                {!loading ? (
                  <motionless />
                    <motionless />
                      className="h-1 rounded-sm bg-accent"
                      style={{ width: \`\${pct}%\`, minWidth: pct > 0 ? 2 : 0 }}
                    />
                  </motionless>
                ) : null}
                <motionless />
                  {loading ? '—' : \`\${pct}% · \${leftToday} left\`}
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-20" />
                ) : (
                  <motionless />
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
                  </motionless>
                )}
                <motionless />
                  Best · {loading ? '—' : data.longestStreak}
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <motionless />
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(todayAcc))}>
                      {todayAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </motionless>
                )}
                <motionless />
                  This session
                </motionless>
              </motionless>

              <motionless />
                <motionless />
                {loading ? (
                  <SkeletonLine className="mt-2 h-9 w-16" />
                ) : (
                  <motionless />
                    <span className={clsx('stat-num text-2xl font-semibold sm:text-3xl', accuracyTone(weekAcc))}>
                      {weekAcc}
                    </span>
                    <span className="text-xs text-mist">%</span>
                  </motionless>
                )}
                <motionless />
                  Last 7 days
                </motionless>
              </motionless>
            </motionless>

            <motionless />
              <motionless />
              <p className="mt-1 text-[12.75px] leading-snug text-mist">
                Spread reps across Math, R&amp;W, and mixed sets.
              </p>
              <motionless />
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
              </motionless>
            </motionless>

            {!loading && leftToday > 0 ? (
              <p className="mt-3 rounded-sm bg-accent/[0.05] px-3 py-2 text-[12.75px] leading-snug text-mist ring-1 ring-accent/[0.1]">
                <span className="font-semibold text-accent">{leftToday}</span> more unique{' '}
                {leftToday === 1 ? 'question' : 'questions'} to hit today&apos;s goal.
              </p>
            ) : !loading && completed >= goal ? (
              <p className="mt-3 text-[12.75px] font-medium text-jade">Today&apos;s goal complete — nice work.</p>
            ) : null}
          </Card>`.split('motionless').join('div');

s = s.slice(0, start) + neu + s.slice(end + '</Card>'.length);
fs.writeFileSync(p, s);
console.log('patched card');
