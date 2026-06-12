// Shared UI primitives for Aidrobe screens
// Globals: AidrobeTokens (from tokens.js)

const T = window.AidrobeTokens;

// ─── Status bar (matches user's prototypes — clean, no notch) ──────────
function StatusBar({ dark = false }) {
  const c = dark ? '#fff' : T.ink;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 28px 6px', fontFamily: T.sans, fontWeight: 600, fontSize: 17, color: c,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><g fill={c}>
          <rect x="0" y="7" width="3" height="4" rx="0.6"/>
          <rect x="5" y="5" width="3" height="6" rx="0.6"/>
          <rect x="10" y="2" width="3" height="9" rx="0.6"/>
          <rect x="15" y="0" width="3" height="11" rx="0.6"/>
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M8 3c2 0 3.8.8 5 2l1-1c-1.5-1.5-3.7-2.5-6-2.5S3.5 2.5 2 4l1 1c1.2-1.2 3-2 5-2zM8 6c1.2 0 2.3.5 3 1.2l1-1c-1-1-2.5-1.7-4-1.7s-3 .7-4 1.7l1 1c.7-.7 1.8-1.2 3-1.2z" fill={c}/>
          <circle cx="8" cy="9.5" r="1.3" fill={c}/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={c} strokeOpacity="0.4" fill="none"/>
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill={c}/>
          <path d="M23 4v4c.7-.3 1.2-1 1.2-2s-.5-1.7-1.2-2z" fill={c} fillOpacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Bell icon w/ optional dot ─────────────────────────────────────────
function BellIcon({ dot = true }) {
  return (
    <div style={{ position: 'relative', width: 28, height: 28 }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4c-3.5 0-6 2.5-6 6v3.5c0 1.2-.4 2.3-1.1 3.2L6 18.5h16l-.9-1.8c-.7-.9-1.1-2-1.1-3.2V10c0-3.5-2.5-6-6-6z" stroke={T.ink} strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M11.5 21c.4 1.2 1.4 2 2.5 2s2.1-.8 2.5-2" stroke={T.ink} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      {dot && <div style={{
        position: 'absolute', top: 3, right: 3, width: 7, height: 7,
        borderRadius: '50%', background: T.accent,
        boxShadow: '0 0 0 2px ' + T.bg,
      }}/>}
    </div>
  );
}

// ─── Bottom Tab Bar ────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'today', label: '今日', icon: 'home' },
    { id: 'wardrobe', label: '衣橱', icon: 'closet' },
    { id: 'add', label: '添加', icon: 'plus', center: true },
    { id: 'me', label: '我的', icon: 'me' },
  ];
  const Icon = ({ name, active }) => {
    const stroke = active ? T.ink : T.ink3;
    const fill = active ? T.ink : 'none';
    if (name === 'home') return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M4 11l9-7 9 7v10c0 .8-.7 1.5-1.5 1.5H5.5C4.7 22.5 4 21.8 4 21V11z" stroke={stroke} strokeWidth="1.6" fill={active ? T.ink : 'none'} fillOpacity={active ? 0.06 : 0}/>
      </svg>
    );
    if (name === 'closet') return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect x="5" y="3.5" width="16" height="19" rx="1.5" stroke={stroke} strokeWidth="1.6"/>
        <path d="M13 3.5v19" stroke={stroke} strokeWidth="1.6"/>
        <circle cx="10.5" cy="13" r="0.8" fill={stroke}/>
        <circle cx="15.5" cy="13" r="0.8" fill={stroke}/>
      </svg>
    );
    if (name === 'me') return (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="9" r="4" stroke={stroke} strokeWidth="1.6" fill={active ? T.ink : 'none'} fillOpacity={active ? 0.06 : 0}/>
        <path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    );
    return null;
  };
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '14px 18px 28px', background: 'linear-gradient(to top, ' + T.bg + ' 70%, ' + T.bg + 'cc 100%)',
    }}>
      {tabs.map(t => t.center ? (
        <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
          width: 56, height: 56, borderRadius: '50%', background: T.ink, border: 'none',
          color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0, cursor: 'pointer', marginTop: -18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), 0 8px 28px rgba(0,0,0,0.12)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
        </button>
      ) : (
        <button key={t.id} onClick={() => onChange && onChange(t.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: active === t.id ? T.ink : T.ink3,
          fontFamily: T.sans, fontSize: 11,
        }}>
          <Icon name={t.icon} active={active === t.id}/>
          <span style={{ fontWeight: active === t.id ? 600 : 400 }}>{t.label}</span>
        </button>
      ))}
      {/* center spacer for plus button */}
      {tabs.findIndex(t => t.center) === 2 ? null : null}
    </div>
  );
}

// ─── Garment placeholder (since we don't have real cutout images) ─────
// Renders subtle striped silhouette w/ category label
function Garment({ kind, w = 80, h = 100, style = {} }) {
  // kind: shirt | blazer | trousers | loafer | sweater | jeans | bag | sneaker | dress | skirt | tee
  const stripes = (
    <defs>
      <pattern id={'stripe-' + kind} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="#000" strokeOpacity="0.04" strokeWidth="2"/>
      </pattern>
    </defs>
  );
  const bg = '#EAE3D4';
  const stroke = '#C9BEA8';
  const paths = {
    shirt: 'M30 14 L46 6 L60 12 L78 6 L92 14 L100 28 L92 36 L86 30 L86 92 C86 96 84 98 80 98 L42 98 C38 98 36 96 36 92 L36 30 L30 36 L22 28 Z',
    blazer: 'M28 16 L46 4 L62 16 L78 4 L96 16 L96 96 C96 100 94 102 90 102 L70 102 L62 64 L54 102 L34 102 C30 102 28 100 28 96 Z',
    trousers: 'M36 4 L88 4 L92 50 L84 102 L70 102 L62 56 L54 102 L40 102 L32 50 Z',
    sweater: 'M28 18 L42 8 C46 4 50 4 54 4 L70 4 C74 4 78 4 82 8 L96 18 L100 32 L90 42 L86 36 L86 92 C86 98 84 100 80 100 L44 100 C40 100 38 98 38 92 L38 36 L34 42 L24 32 Z',
    jeans: 'M34 6 L90 6 L92 48 L86 100 L72 100 L64 56 L60 56 L52 100 L38 100 L32 48 Z',
    dress: 'M40 10 L60 4 L84 10 L88 36 L96 96 C96 100 94 102 90 102 L34 102 C30 102 28 100 28 96 L36 36 Z',
    skirt: 'M30 12 L94 12 L102 96 C102 100 100 102 96 102 L28 102 C24 102 22 100 22 96 Z',
    tee: 'M22 20 L42 8 L62 14 L82 8 L102 20 L98 36 L86 32 L86 92 C86 96 84 98 80 98 L44 98 C40 98 38 96 38 92 L38 32 L26 36 Z',
    loafer: 'M14 50 L18 38 C24 30 38 28 50 28 C70 28 92 32 102 38 L110 50 L108 62 C108 66 104 68 100 68 L20 68 C16 68 14 66 14 62 Z',
    sneaker: 'M10 50 L18 36 C26 30 36 28 50 28 C76 28 96 36 110 50 L112 64 C112 68 110 70 106 70 L14 70 C10 70 8 68 8 64 Z',
    bag: 'M30 36 L94 36 L98 96 C98 100 96 102 92 102 L32 102 C28 102 26 100 26 96 Z M44 36 V26 C44 18 50 14 62 14 C74 14 80 18 80 26 V36',
  };
  const labels = {
    shirt: '衬衫', blazer: '西装', trousers: '西裤', sweater: '针织',
    jeans: '牛仔', dress: '连衣裙', skirt: '半裙', tee: 'T恤',
    loafer: '乐福鞋', sneaker: '小白鞋', bag: '托特包',
  };
  return (
    <div style={{
      width: w, height: h, position: 'relative', display: 'flex',
      alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      <svg width={w} height={h} viewBox="0 0 124 110" preserveAspectRatio="xMidYMid meet">
        {stripes}
        <path d={paths[kind] || paths.shirt} fill={bg} stroke={stroke} strokeWidth="1.2"/>
        <path d={paths[kind] || paths.shirt} fill={'url(#stripe-' + kind + ')'}/>
      </svg>
      <span style={{
        position: 'absolute', bottom: 2, fontFamily: T.mono, fontSize: 9,
        color: T.ink4, letterSpacing: 0.5,
      }}>{labels[kind] || kind}</span>
    </div>
  );
}

// ─── Status pill ───────────────────────────────────────────────────────
function StatusPill({ kind = 'ok', label }) {
  const map = {
    ok: { color: T.ok, bg: T.okBg, label: label || '可穿' },
    warn: { color: T.warn, bg: T.warnBg, label: label || '待洗' },
    danger: { color: T.danger, bg: T.dangerBg, label: label || '不可穿' },
  };
  const m = map[kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: T.sans, fontSize: 11, color: m.color, fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }}/>
      {m.label}
    </span>
  );
}

// ─── Tag (small soft beige pill) ───────────────────────────────────────
function Tag({ children, dark, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 9px', borderRadius: 999,
      fontFamily: T.sans, fontSize: 11, fontWeight: 500,
      background: dark ? T.ink : T.cardSoft,
      color: dark ? '#fff' : T.ink2,
      ...style,
    }}>{children}</span>
  );
}

// Export
Object.assign(window, { StatusBar, BellIcon, TabBar, Garment, StatusPill, Tag });
