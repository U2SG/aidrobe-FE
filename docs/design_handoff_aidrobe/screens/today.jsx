// Today screen — optimized version of user's prototype 1
// Adds: stronger time urgency (countdown ring + dynamic strategy),
// time_sensitivity badges, location/care info on outfit cards.

const T_today = window.AidrobeTokens;

function CountdownRing({ minutes = 38, max = 90 }) {
  const r = 26, c = 2 * Math.PI * r;
  const pct = Math.min(1, minutes / max);
  const dash = c * (1 - pct);
  const urgent = minutes <= 20;
  const tight = minutes <= 40;
  const color = urgent ? '#B85C4A' : (tight ? T_today.accent : T_today.ok);
  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke={T_today.divider} strokeWidth="3"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 600ms ease, stroke 300ms ease' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <span style={{ fontFamily: T_today.serif, fontSize: 22, fontWeight: 600, color: T_today.ink }}>{minutes}</span>
        <span style={{ fontFamily: T_today.sans, fontSize: 9, color: T_today.ink3, marginTop: 2 }}>分钟</span>
      </div>
    </div>
  );
}

// Time-budget bar — visualizes prep time vs remaining time
function TimeBudgetBar({ prepMinutes, remaining }) {
  const fits = prepMinutes <= remaining;
  const ratio = Math.min(1, prepMinutes / Math.max(remaining, 1));
  const slack = Math.max(0, remaining - prepMinutes);
  const color = !fits ? '#B85C4A' : (ratio > 0.6 ? T_today.accent : T_today.ok);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        position: 'relative', height: 6, background: T_today.divider, borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: (ratio * 100) + '%', background: color, borderRadius: 3,
          transition: 'width 500ms ease, background 300ms',
        }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: T_today.ink3, fontFamily: T_today.mono }}>
        <span style={{ color }}>准备 {prepMinutes}′</span>
        <span>{fits ? '余 ' + slack + '′' : '超 ' + (prepMinutes - remaining) + '′'}</span>
      </div>
    </div>
  );
}

function StrategyTabs({ active, onChange }) {
  const tabs = [
    { id: 'safe', label: '最稳妥', sub: '38分钟' },
    { id: 'fast', label: '最省时', sub: '5分钟' },
    { id: 'stylish', label: '更有风格', sub: '宽裕' },
  ];
  const idx = tabs.findIndex(t => t.id === active);
  return (
    <div style={{
      position: 'relative', background: '#EBE3D2', borderRadius: 999,
      padding: 4, display: 'flex', margin: '0 24px',
    }}>
      <div style={{
        position: 'absolute', top: 4, bottom: 4, left: 4,
        width: 'calc(33.333% - 2.66px)', borderRadius: 999, background: '#fff',
        boxShadow: T_today.shadowSm,
        transform: 'translateX(' + (idx * 100) + '%)',
        transition: 'transform 320ms cubic-bezier(.4,.0,.2,1)',
      }}/>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, position: 'relative', zIndex: 1, background: 'none', border: 'none',
          padding: '10px 0', cursor: 'pointer', fontFamily: T_today.sans,
          color: active === t.id ? T_today.ink : T_today.ink3,
          fontWeight: active === t.id ? 600 : 500, fontSize: 14,
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// Outfit data — prepMinutes is the realistic prep time
const OUTFITS = {
  safe: {
    title: '最稳妥', sub: '适合大多数通勤场合', icon: 'shield',
    pieces: [
      { kind: 'shirt', x: 30, y: 40, scale: 1.1 },
      { kind: 'blazer', x: 175, y: 30, scale: 1.15 },
      { kind: 'trousers', x: 90, y: 175, scale: 1.05 },
      { kind: 'loafer', x: 195, y: 240, scale: 0.85 },
    ],
    prepMinutes: 8,
    timeLabel: 'standard',
    tags: ['主衣柜可取', '无需熨烫', '黑白经典'],
    reason: '延续你常喜欢的黑白通勤风格，整体干净利落。主要单品都在主衣柜，今早 38 分钟足够。',
  },
  fast: {
    title: '最省时', sub: '5 分钟搞定出门', icon: 'clock',
    pieces: [
      { kind: 'sweater', x: 60, y: 50, scale: 1.1 },
      { kind: 'jeans', x: 100, y: 175, scale: 1.05 },
      { kind: 'sneaker', x: 175, y: 260, scale: 0.85 },
    ],
    prepMinutes: 5,
    timeLabel: 'rushed',
    tags: ['主衣柜可取', '近期常穿', '免熨烫'],
    reason: '都是你最近一周穿过的单品，无需翻找。米白针织遮挡好搭，赶时间也不出错。',
  },
  stylish: {
    title: '更有风格', sub: '简约高级感', icon: 'sparkle',
    pieces: [
      { kind: 'shirt', x: 30, y: 50, scale: 1.0 },
      { kind: 'blazer', x: 175, y: 30, scale: 1.2 },
      { kind: 'skirt', x: 95, y: 180, scale: 1.05 },
      { kind: 'loafer', x: 195, y: 250, scale: 0.85 },
      { kind: 'bag', x: 30, y: 230, scale: 0.7 },
    ],
    prepMinutes: 12,
    timeLabel: 'relaxed',
    tags: ['含咖色半裙', '需取玄关包', '低饱和配色'],
    reason: '在你偏好的低饱和米咖色里加一点比例变化，长西装 + 半裙更有造型感。包在玄关，整体准备 12 分钟。',
  },
};

function StrategyIcon({ kind, active }) {
  const c = active ? T_today.ink : T_today.ink3;
  if (kind === 'shield') return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L4 4v5c0 4 2.5 7 6 9 3.5-2 6-5 6-9V4l-6-2z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
  if (kind === 'clock') return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.4"/>
      <path d="M10 6v4l2.5 2" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3l1.5 4 4 1.5-4 1.5L10 14l-1.5-4L4.5 8.5 8.5 7z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function OutfitCanvas({ pieces, dir = 1 }) {
  return (
    <div style={{
      position: 'relative', height: 360, width: '100%',
      overflow: 'hidden',
      animation: 'aidrobe-slide-' + (dir > 0 ? 'in-r' : 'in-l') + ' 380ms cubic-bezier(.2,.7,.2,1) both',
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          transform: 'scale(' + p.scale + ')',
          animation: 'aidrobe-pop 600ms ' + (i * 80 + 80) + 'ms cubic-bezier(.34,1.56,.64,1) backwards',
        }}>
          <Garment kind={p.kind} w={120} h={106}/>
        </div>
      ))}
    </div>
  );
}

function MiniOutfitCard({ title, sub, pieces, location, time, mood, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: T_today.card, borderRadius: 18, padding: 14,
      border: 'none', textAlign: 'left', cursor: 'pointer',
      boxShadow: T_today.shadowSm,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        height: 110, position: 'relative', background: T_today.cardInner,
        borderRadius: 12, overflow: 'hidden',
      }}>
        {pieces.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'scale(' + p.scale + ')' }}>
            <Garment kind={p.kind} w={64} h={56}/>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: T_today.serif, fontSize: 16, fontWeight: 600, color: T_today.ink, marginBottom: 2 }}>{title}</div>
        <div style={{ fontFamily: T_today.sans, fontSize: 11, color: T_today.ink3, lineHeight: 1.5 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
        <Tag style={{ fontSize: 10, padding: '3px 8px' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 5h8M2 5l3 4 5-7" stroke={T_today.ink2} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {location}
        </Tag>
        <Tag style={{ fontSize: 10, padding: '3px 8px' }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke={T_today.ink2} strokeWidth="1.2"/>
            <path d="M6 4v2l1.5 1" stroke={T_today.ink2} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {time}
        </Tag>
      </div>
    </button>
  );
}

const STRATEGY_ORDER = ['safe', 'fast', 'stylish'];
function TodayScreen({ onTabChange, onOutfitClick, onWearClick, onWearSecondary }) {
  const [strategy, setStrategy] = React.useState('safe');
  const [dir, setDir] = React.useState(1);
  const outfit = OUTFITS[strategy];
  const handleStrategy = (next) => {
    const a = STRATEGY_ORDER.indexOf(strategy);
    const b = STRATEGY_ORDER.indexOf(next);
    setDir(b > a ? 1 : -1);
    setStrategy(next);
  };

  return (
    <div style={{ width: '100%', height: '100%', background: T_today.bg, fontFamily: T_today.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>

      {/* Header */}
      <div style={{ padding: '6px 24px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: T_today.serif, fontSize: 30, fontWeight: 600, color: T_today.ink,
            margin: 0, letterSpacing: '-0.01em',
          }}>早上好，Mia</h1>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: T_today.ink2, fontSize: 14 }}>
            <span>距出门还有</span>
            <span style={{ fontFamily: T_today.serif, fontSize: 22, fontWeight: 600, color: T_today.accent, letterSpacing: '-0.02em' }}>38</span>
            <span>分钟 · 9:41 → 10:19</span>
          </div>
        </div>
        <CountdownRing minutes={38} max={90}/>
      </div>

      {/* Section title */}
      <div style={{ padding: '12px 24px 14px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: T_today.serif, fontSize: 22, fontWeight: 600, color: T_today.ink, margin: 0 }}>今日穿搭</h2>
        <span style={{ fontSize: 11, color: T_today.ink3 }}>多云 18° / 通勤</span>
      </div>

      <StrategyTabs active={strategy} onChange={handleStrategy}/>

      {/* Main outfit card */}
      <div style={{ margin: '14px 16px 0', background: T_today.card, borderRadius: 24, padding: '18px 16px 14px', boxShadow: T_today.shadowMd, position: 'relative', animation: 'aidrobe-rise 480ms 80ms cubic-bezier(.2,.7,.2,1) backwards' }}>
        <div style={{ display: 'flex' }}>
          {/* Left rail w/ icons */}
          <div style={{ width: 78, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: T_today.cardSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <StrategyIcon kind={outfit.icon} active/>
              </div>
              <div style={{ fontFamily: T_today.serif, fontSize: 15, fontWeight: 600, color: T_today.ink, marginTop: 4 }}>{outfit.title}</div>
              <div style={{ fontSize: 10, color: T_today.ink3, lineHeight: 1.4 }}>{outfit.sub}</div>
            </div>

            <div style={{
              padding: '8px 9px', background: T_today.cardSoft, borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontFamily: T_today.mono, fontSize: 9, color: T_today.accent, letterSpacing: 0.6, fontWeight: 600 }}>
                {outfit.timeLabel.toUpperCase()}
              </span>
              <TimeBudgetBar prepMinutes={outfit.prepMinutes} remaining={38}/>
            </div>

            {outfit.tags.map((tag, i) => (
              <div key={i} style={{ fontSize: 10, color: T_today.ink3, lineHeight: 1.4, paddingLeft: 2 }}>
                · {tag}
              </div>
            ))}
          </div>

          {/* Outfit canvas */}
          <div style={{ flex: 1, position: 'relative', minHeight: 320 }}>
            <OutfitCanvas key={strategy} pieces={outfit.pieces} dir={dir}/>
          </div>
        </div>

        {/* Reason strip */}
        <div style={{
          margin: '4px 4px 12px', padding: '10px 12px', background: T_today.bgAlt, borderRadius: 12,
          fontSize: 12, color: T_today.ink2, lineHeight: 1.55, textWrap: 'pretty',
        }}>
          “{outfit.reason}”
        </div>

        <button onClick={onWearClick} style={{
          width: '100%', height: 50, background: T_today.ink, color: '#fff',
          border: 'none', borderRadius: 14, fontFamily: T_today.sans, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          今天穿这套
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10 }}>
          <button onClick={onOutfitClick} style={{ background: 'none', border: 'none', color: T_today.ink3, fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>查看详情</button>
          <span style={{ color: T_today.divider }}>|</span>
          <button onClick={onWearSecondary} style={{ background: 'none', border: 'none', color: T_today.ink3, fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>不喜欢</button>
          <span style={{ color: T_today.divider }}>|</span>
          <button onClick={onWearSecondary} style={{ background: 'none', border: 'none', color: T_today.ink3, fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>换一套</button>
        </div>
      </div>

      {/* Secondary outfits — labeled clearer */}
      <div style={{ padding: '16px 16px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 8px 8px' }}>
          <span style={{ fontFamily: T_today.serif, fontSize: 14, fontWeight: 600, color: T_today.ink }}>更多方案</span>
          <span style={{ fontSize: 11, color: T_today.ink3 }}>基于真实衣橱</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, animation: 'aidrobe-rise 480ms 240ms cubic-bezier(.2,.7,.2,1) backwards' }}>
          <MiniOutfitCard
            title="温柔通勤"
            sub="浅色系干净温柔，日常通勤好选择。"
            pieces={[
              { kind: 'sweater', x: 4, y: 8, scale: 0.7 },
              { kind: 'trousers', x: 50, y: 28, scale: 0.6 },
              { kind: 'sneaker', x: 90, y: 60, scale: 0.5 },
            ]}
            location="主衣柜可取" time="约 8 分钟"/>
          </div>
          <div style={{ flex: 1, animation: 'aidrobe-rise 480ms 340ms cubic-bezier(.2,.7,.2,1) backwards' }}>
          <MiniOutfitCard
            title="休闲舒适"
            sub="牛仔 + 针织，舒适自在不出错。"
            pieces={[
              { kind: 'sweater', x: 4, y: 8, scale: 0.7 },
              { kind: 'jeans', x: 50, y: 28, scale: 0.6 },
              { kind: 'bag', x: 95, y: 50, scale: 0.45 },
            ]}
            location="主衣柜可取" time="约 5 分钟"/>
          </div>
        </div>
      </div>

      <TabBar active="today" onChange={onTabChange}/>
    </div>
  );
}

window.TodayScreen = TodayScreen;
