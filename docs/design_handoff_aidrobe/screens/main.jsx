// Wardrobe + Add + Style screens
const T_w = window.AidrobeTokens;

// ════════════════════════════════════════════════════════════════════
// WARDROBE — adds Whering-style insight chips with mini visualizations
// ════════════════════════════════════════════════════════════════════

const WARDROBE_ITEMS = [
  { id: 1, kind: 'shirt', name: '白衬衫', cat: '上衣', status: 'ok', loc: '主衣柜', wears: 14 },
  { id: 2, kind: 'blazer', name: '米色西装外套', cat: '外套', status: 'ok', loc: '主衣柜', wears: 6 },
  { id: 3, kind: 'trousers', name: '黑色西裤', cat: '下装', status: 'ok', loc: '主衣柜', wears: 22 },
  { id: 4, kind: 'loafer', name: '黑色乐福鞋', cat: '鞋', status: 'ok', loc: '玄关鞋柜', wears: 18 },
  { id: 5, kind: 'sweater', name: '米色针织衫', cat: '上衣', status: 'warn', loc: '主衣柜', wears: 8 },
  { id: 6, kind: 'skirt', name: '咖色半身裙', cat: '下装', status: 'ok', loc: '主衣柜', wears: 4 },
];

function WardrobeItemCard({ item }) {
  return (
    <div style={{
      background: T_w.card, borderRadius: 18, padding: 12,
      boxShadow: T_w.shadowSm, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        height: 130, background: T_w.cardInner, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Garment kind={item.kind} w={110} h={120}/>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontFamily: T_w.serif, fontSize: 14, fontWeight: 600, color: T_w.ink }}>{item.name}</span>
          <Tag style={{ fontSize: 10, padding: '2px 7px' }}>{item.cat}</Tag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusPill kind={item.status}/>
          <span style={{ fontSize: 10, color: T_w.ink4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="8" height="8" stroke={T_w.ink4} strokeWidth="1"/>
              <path d="M6 2v8" stroke={T_w.ink4} strokeWidth="1"/>
            </svg>
            {item.loc}
          </span>
        </div>
      </div>
    </div>
  );
}

// Mini insight chip with sparkline / dots
function InsightChip({ icon, label, sub, viz }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '10px 12px', background: T_w.card, borderRadius: 14,
      flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ fontSize: 11, color: T_w.ink3 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: T_w.serif, fontSize: 15, fontWeight: 600, color: T_w.ink }}>{sub}</span>
        {viz}
      </div>
    </div>
  );
}

function WardrobeScreen({ onTabChange, onItemClick, onInsightsClick }) {
  const [filter, setFilter] = React.useState('全部');
  const cats = ['全部', '上衣', '下装', '外套', '鞋', '可穿'];

  return (
    <div style={{ width: '100%', height: '100%', background: T_w.bg, fontFamily: T_w.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: T_w.serif, fontSize: 30, fontWeight: 600, color: T_w.ink, margin: 0 }}>我的衣橱</h1>
          <div style={{ marginTop: 8, color: T_w.ink2, fontSize: 13 }}>
            已收纳 <span style={{ color: T_w.accent, fontFamily: T_w.serif, fontWeight: 600 }}>86</span> 件
            ，今日可穿 <span style={{ color: T_w.accent, fontFamily: T_w.serif, fontWeight: 600 }}>54</span> 件
          </div>
        </div>
        <BellIcon/>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, padding: '18px 20px 4px' }}>
        <div style={{
          flex: 1, height: 44, background: T_w.card, borderRadius: 12,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
          boxShadow: T_w.shadowSm,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke={T_w.ink3} strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke={T_w.ink3} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: T_w.ink4, fontSize: 14 }}>搜索衣物 · 颜色 · 品类</span>
        </div>
        <button style={{
          width: 80, height: 44, background: T_w.card, borderRadius: 12, border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 13, color: T_w.ink2, boxShadow: T_w.shadowSm, cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M4 7h6M5 11h4" stroke={T_w.ink2} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          筛选
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px 6px', overflowX: 'auto' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: '8px 16px', borderRadius: 999, fontSize: 13,
            fontWeight: filter === c ? 600 : 500,
            background: filter === c ? T_w.ink : 'transparent',
            color: filter === c ? '#fff' : T_w.ink2,
            border: filter === c ? 'none' : '1px solid ' + T_w.divider,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 200ms',
          }}>{c}</button>
        ))}
      </div>

      {/* Insight banner — upgraded from single row to mini-viz panel */}
      <div onClick={onInsightsClick} style={{
        margin: '14px 20px 0', padding: 14, background: T_w.cardSoft,
        borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 13l3-5 3 3 5-7" stroke={T_w.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 4h4v4" stroke={T_w.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: T_w.serif, fontSize: 14, fontWeight: 600, color: T_w.ink }}>本周穿搭洞察</span>
          </div>
          <span style={{ fontSize: 11, color: T_w.ink3 }}>查看全部 ›</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <InsightChip
            icon={<div style={{ display: 'flex', gap: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1A1714' }}/>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '1px solid '+T_w.divider }}/>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9C9088' }}/>
            </div>}
            label="主色调" sub="黑白灰"
            viz={<span style={{ fontSize: 10, color: T_w.ink3 }}>72%</span>}/>
          <InsightChip
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2h6l-.5 8H3.5z" stroke={T_w.accent} strokeWidth="1.2"/></svg>}
            label="最常穿" sub="衬衫"
            viz={<span style={{ fontSize: 10, color: T_w.ink3 }}>14×</span>}/>
          <InsightChip
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              {[0,1,2,3,4,5,6].map(i => (<rect key={i} x={i*1.6+0.2} y={i===2?2:6} width="1.2" height={i===2?8:4} fill={i===2?T_w.accent:T_w.ink4}/>))}
            </svg>}
            label="最常穿日" sub="周三"/>
        </div>
      </div>

      {/* Items grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 20px 100px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {WARDROBE_ITEMS.map(it => (
          <div key={it.id} onClick={() => onItemClick && onItemClick(it)} style={{ cursor: 'pointer' }}>
            <WardrobeItemCard item={it}/>
          </div>
        ))}
      </div>

      <TabBar active="wardrobe" onChange={onTabChange}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ADD SCREEN — clearer primary/secondary entries
// ════════════════════════════════════════════════════════════════════

function AddEntry({ primary, title, sub, illust, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: primary ? T_w.ink : T_w.card,
      borderRadius: 20, padding: primary ? '20px 18px' : '16px 16px',
      border: 'none', cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: primary ? T_w.shadowMd : T_w.shadowSm,
      color: primary ? '#fff' : T_w.ink,
      transition: 'transform 150ms',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T_w.serif, fontSize: primary ? 22 : 18, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: primary ? 'rgba(255,255,255,0.65)' : T_w.ink3, lineHeight: 1.5 }}>{sub}</div>
      </div>
      {illust}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M6 4l5 5-5 5" stroke={primary ? '#fff' : T_w.ink3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function AddScreen({ onTabChange, onCameraClick }) {
  const [smartMode, setSmartMode] = React.useState('quick');
  return (
    <div style={{ width: '100%', height: '100%', background: T_w.bg, fontFamily: T_w.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: T_w.serif, fontSize: 30, fontWeight: 600, color: T_w.ink, margin: 0 }}>添加衣物</h1>
          <div style={{ marginTop: 8, color: T_w.ink3, fontSize: 13 }}>选择最方便的方式加入衣橱</div>
        </div>
        <BellIcon dot={false}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Primary CTA — camera */}
        <AddEntry primary
          title="拍照添加"
          sub="对着衣服一拍，AI 自动识别品类、颜色、版型"
          onClick={onCameraClick}
          illust={
            <div style={{ width: 72, height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="32" viewBox="0 0 36 32" fill="none">
                <rect x="2" y="6" width="32" height="22" rx="3" stroke="#fff" strokeWidth="1.5"/>
                <rect x="11" y="2" width="14" height="6" rx="1.5" stroke="#fff" strokeWidth="1.5"/>
                <circle cx="18" cy="17" r="6" stroke="#fff" strokeWidth="1.5"/>
                <circle cx="18" cy="17" r="2.5" fill="#fff"/>
                <circle cx="29" cy="11" r="1" fill="#fff"/>
              </svg>
            </div>
          }/>

        {/* Section: 已有内容 */}
        <div style={{ fontSize: 11, color: T_w.ink3, marginTop: 6, marginLeft: 4, letterSpacing: 0.5, fontFamily: T_w.mono, textTransform: 'uppercase' }}>已有内容 · 一键导入</div>

        <AddEntry
          title="从相册导入" sub="批量选择，适合已有照片"
          illust={
            <div style={{ width: 72, height: 72, position: 'relative' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  position: 'absolute', width: 36, height: 48, borderRadius: 6,
                  background: ['#EAE3D2','#F5EFE6','#D9CCB4'][i],
                  border: '1.5px solid #fff',
                  left: i*14, top: i*4,
                  transform: 'rotate(' + (i-1)*8 + 'deg)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                }}/>
              ))}
            </div>
          }/>

        <AddEntry
          title="粘贴商品链接" sub="淘宝 · 京东 · 小红书 · 得物 · 自动识别 SKU 与版型"
          illust={
            <div style={{ width: 72, height: 72, borderRadius: 12, background: T_w.cardSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M9 13l-3 3a3 3 0 01-4-4l4-4a3 3 0 014 0M13 9l3-3a3 3 0 014 4l-4 4a3 3 0 01-4 0M8 14l6-6" stroke={T_w.accent} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: T_w.mono, fontSize: 8, color: T_w.ink3 }}>https://</span>
            </div>
          }/>

        <AddEntry
          title="从其他 App 分享" sub="得物、小红书、淘宝、微信 · 直接分享到 Aidrobe"
          illust={
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T_w.ink, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>得</div>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#E64C4C', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>红</div>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T_w.cardSoft, color: T_w.ink2, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>···</div>
            </div>
          }/>

        {/* Tips */}
        <div style={{ background: T_w.cardSoft, borderRadius: 14, padding: 14, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: T_w.ink3, marginBottom: 10, letterSpacing: 0.4 }}>小提示</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { icon: 'M2 6h12M5 3v3M9 3v3M3 6v8h10V6', t: '单件拍摄更准', s: '避免遮挡' },
              { icon: 'M2 8 L8 2 L14 8 L8 14 Z', t: '尽量纯色背景', s: '减少干扰' },
              { icon: 'M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2', t: '光线充足', s: '识别更精准' },
            ].map((tip, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: T_w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d={tip.icon} stroke={T_w.accent} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T_w.ink2 }}>{tip.t}</span>
                <span style={{ fontSize: 10, color: T_w.ink3 }}>{tip.s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Smart mode */}
        <div style={{ background: T_w.card, borderRadius: 14, padding: 14, boxShadow: T_w.shadowSm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_w.ink }}>智能模式</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke={T_w.ink3} strokeWidth="1"/>
              <path d="M7 9.5V7M7 5h.01" stroke={T_w.ink3} strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'quick', t: '快速入库', s: '自动识别，快速保存' },
              { id: 'detailed', t: '精细识别', s: '尺码 · 版型 · 材质' },
            ].map(m => (
              <button key={m.id} onClick={() => setSmartMode(m.id)} style={{
                padding: '12px 14px', borderRadius: 10,
                background: smartMode === m.id ? T_w.bgAlt : 'transparent',
                border: '1px solid ' + (smartMode === m.id ? T_w.ink : T_w.divider),
                textAlign: 'left', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T_w.ink, marginBottom: 2 }}>{m.t}</div>
                  <div style={{ fontSize: 10, color: T_w.ink3 }}>{m.s}</div>
                </div>
                {smartMode === m.id && (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: T_w.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="9" height="9" viewBox="0 0 9 9"><path d="M2 4.5l1.5 1.5L7 2.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TabBar active="add" onChange={onTabChange}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STYLE PROFILE — improved learning state feedback
// ════════════════════════════════════════════════════════════════════

function InspoTile({ idx, accent }) {
  const palettes = [
    ['#E8DDC9', '#C4A881', '#3A332B'],
    ['#F0EBE0', '#7A6D5C', '#1A1714'],
    ['#EFE5D2', '#D4B687', '#5C4F3F'],
    ['#E5DDCC', '#A89377', '#2F2A23'],
    ['#F5EFE6', '#9C8B72', '#3A332B'],
  ];
  const p = palettes[idx % palettes.length];
  return (
    <div style={{
      borderRadius: 12, height: 130, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(155deg, ' + p[0] + ' 0%, ' + p[1] + ' 100%)',
    }}>
      {/* abstract figure suggestion */}
      <div style={{
        position: 'absolute', left: '50%', top: 18, width: 22, height: 22,
        borderRadius: '50%', background: p[2], opacity: 0.25, transform: 'translateX(-50%)',
      }}/>
      <div style={{
        position: 'absolute', left: '50%', top: 36, width: 60, height: 70,
        background: p[2], opacity: 0.32, borderRadius: '40% 40% 12% 12%', transform: 'translateX(-50%)',
      }}/>
      <div style={{
        position: 'absolute', left: '50%', bottom: 0, width: 38, height: 50,
        background: p[2], opacity: 0.2, transform: 'translateX(-50%)',
      }}/>
      <span style={{
        position: 'absolute', bottom: 6, right: 8, fontFamily: T_w.mono, fontSize: 8, color: '#fff', opacity: 0.65,
      }}>{['xhs','dy','tb','pin','ig'][idx % 5]} · {String(idx+1).padStart(2,'0')}</span>
    </div>
  );
}

function StyleScreen({ onTabChange }) {
  return (
    <div style={{ width: '100%', height: '100%', background: T_w.bg, fontFamily: T_w.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: T_w.serif, fontSize: 30, fontWeight: 600, color: T_w.ink, margin: 0 }}>风格画像</h1>
          <div style={{ marginTop: 6, color: T_w.ink3, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>系统正在学习你的偏好</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T_w.accent, animation: 'aidrobe-pulse 1.6s ease-in-out infinite' }}/>
          </div>
        </div>
        <BellIcon/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Style preferences */}
        <div style={{ background: T_w.card, borderRadius: 18, padding: 16, boxShadow: T_w.shadowSm }}>
          <div style={{ fontSize: 12, color: T_w.ink3, marginBottom: 10 }}>你的风格偏好 · 置信度 72%</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Tag style={{ padding: '7px 12px', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="2" y="3" width="8" height="6" rx="1" stroke={T_w.ink2} strokeWidth="1.2"/>
                <path d="M5 3V2.5a1 1 0 011-1h0a1 1 0 011 1V3" stroke={T_w.ink2} strokeWidth="1.2"/>
              </svg>极简通勤
            </Tag>
            <Tag style={{ padding: '7px 12px', fontSize: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(120deg, #1A1714 50%, #fff 50%)', border: '0.5px solid '+T_w.divider }}/>
              黑白灰
            </Tag>
            <Tag style={{ padding: '7px 12px', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1l1.5 3.5L11 6l-3.5 1.5L6 11 4.5 7.5 1 6l3.5-1.5z" stroke={T_w.accent} strokeWidth="1.1"/>
              </svg>干净利落
            </Tag>
            <Tag style={{ padding: '7px 12px', fontSize: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#C4A881' }}/>
              低饱和
            </Tag>
            <Tag style={{ padding: '7px 12px', fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6 L4 8 L10 2" stroke={T_w.ink2} strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              </svg>直筒裤
            </Tag>
          </div>
          <div style={{
            marginTop: 12, fontSize: 11, color: T_w.ink3, lineHeight: 1.6,
            padding: 10, background: T_w.bgAlt, borderRadius: 10,
          }}>
            推荐将优先考虑你偏爱的简洁通勤风格。可以继续上传灵感来提升精准度。
          </div>
        </div>

        {/* Inspirations */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 10px' }}>
            <span style={{ fontFamily: T_w.serif, fontSize: 16, fontWeight: 600, color: T_w.ink }}>灵感来源</span>
            <span style={{ fontFamily: T_w.mono, fontSize: 11, color: T_w.ink3 }}>6 / 6 已学习</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[0,1,2,3,4].map(i => <InspoTile key={i} idx={i}/>)}
            <button style={{
              borderRadius: 12, height: 130, background: 'transparent',
              border: '1.5px dashed ' + T_w.ink4,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', color: T_w.ink3,
            }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: T_w.cardSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke={T_w.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 11 }}>添加灵感</span>
            </button>
          </div>
        </div>

        {/* Sources */}
        <div style={{ background: T_w.card, borderRadius: 18, boxShadow: T_w.shadowSm, overflow: 'hidden' }}>
          {[
            {
              t: '粘贴链接学习', s: '导入小红书 / 抖音 / 商品链接',
              icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M8 11l-3 3a2.5 2.5 0 01-3.5-3.5L5 7a2.5 2.5 0 013.5 0M11 7l3-3a2.5 2.5 0 013.5 3.5L13.5 11a2.5 2.5 0 01-3.5 0M7 11l4-4" stroke={T_w.accent} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>,
            },
            {
              t: '上传截图或杂志', s: '支持多图批量学习',
              icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="3" width="14" height="12" rx="1.5" stroke={T_w.accent} strokeWidth="1.4"/>
                <circle cx="6.5" cy="7" r="1.2" stroke={T_w.accent} strokeWidth="1.2"/>
                <path d="M2 12l4-4 3 3 3-2 4 4" stroke={T_w.accent} strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>,
            },
            {
              t: '最近学习结果', s: '已识别偏好：直筒裤、衬衫、米白色',
              icon: <div style={{ width: 28, height: 28, borderRadius: '50%', background: T_w.cardSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 13L5 8l3 2 5-7" stroke={T_w.accent} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>,
              meta: '完成 8 个来源',
            },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid ' + T_w.divider : 'none',
              cursor: 'pointer',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: T_w.cardSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {row.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T_w.ink, marginBottom: 2 }}>{row.t}</div>
                <div style={{ fontSize: 11, color: T_w.ink3 }}>{row.s}</div>
              </div>
              {row.meta && <span style={{ fontSize: 10, color: T_w.ink4, fontFamily: T_w.mono }}>{row.meta}</span>}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke={T_w.ink4} strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="me" onChange={onTabChange}/>
    </div>
  );
}

window.WardrobeScreen = WardrobeScreen;
window.AddScreen = AddScreen;
window.StyleScreen = StyleScreen;
