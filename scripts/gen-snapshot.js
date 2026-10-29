const fs = require('fs');
const path = require('path');

const d = 'div';
const o = (tag, attrs, inner) => {
  if (inner === undefined) return `<${tag}${attrs ? ' ' + attrs : ''} />`;
  return `<${tag}${attrs ? ' ' + attrs : ''}>${inner}</${tag}>`;
};

const card = [
  '        <aside className="lg:pt-5 lg:self-stretch">',
  '          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">',
  '            <div className="grid grid-cols-2 gap-3 sm:gap-4">',
  '              <motionless />',
].join('\n');

// manual write - use replace on motionless placeholder
let s = `        <aside className="lg:pt-5 lg:self-stretch">
          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              PLACE_TODAY
              PLACE_STREAK
              PLACE_TODAY_ACC
              PLACE_WEEK_ACC
            </div>
            PLACE_MIX
            PLACE_FOOTER
          </Card>
        </aside>`;

const today = `              <div className="rounded-sm bg-accent/[0.07] px-3 py-3 ring-1 ring-accent/[0.14]">
                <div className="kicker text-accent">Today</motionless>
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
              </motionless>`;

s = s.split('motionless').join('div');
s = s.replace('PLACE_TODAY', today.split('PLACE_TODAY')[0] === today ? today : today);

// too messy - write file directly as string array
const parts = [];
const push = (x) => parts.push(x);
push('        <aside className="lg:pt-5 lg:self-stretch">');
push('          <Card className="flex h-full flex-col border border-rule/80 bg-gradient-to-b from-paper to-accent/[0.04] p-6 shadow-soft ring-1 ring-accent/[0.12] sm:p-7">');
push('            <motionless />');
// STOP

fs.writeFileSync(path.join(__dirname, 'snapshot-card-fixed.txt'), 'todo');
