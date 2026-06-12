// New screens — onboarding, outfit detail, item detail, insights, calendar, import confirm
const T_n = window.AidrobeTokens;

// ════════════════════════════════════════════════════════════════════
// ONBOARDING — 3 steps in one screen for canvas presentation
// ════════════════════════════════════════════════════════════════════
function OnboardingScreen({ step = 1, onTabChange }) {
  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? T_n.ink : T_n.divider,
            transition: 'background 300ms',
          }}/>
        ))}
      </div>

      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 28px 28px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: T_n.mono, fontSize: 11, letterSpacing: 1.2, color: T_n.accent, marginBottom: 16 }}>AIDROBE · 01</div>
            <h1 style={{ fontFamily: T_n.serif, fontSize: 38, fontWeight: 600, color: T_n.ink, lineHeight: 1.15, margin: 0, letterSpacing: '-0.02em' }}>
              不是更多衣服，<br/>而是每天<br/>更快穿对。
            </h1>
            <p style={{ marginTop: 24, fontSize: 14, color: T_n.ink2, lineHeight: 1.7 }}>
              基于你真实拥有、现在能穿、找得到、来得及拿的衣服，给出 3 套穿搭决策。
            </p>
          </div>

          {/* Hero illustration */}
          <div style={{ position: 'relative', height: 280, margin: '0 -20px' }}>
            {[
              { kind: 'blazer', x: 30, y: 0, scale: 1.2, rot: -6 },
              { kind: 'shirt', x: 175, y: 30, scale: 1.0, rot: 4 },
              { kind: 'trousers', x: 90, y: 110, scale: 0.95, rot: 0 },
              { kind: 'loafer', x: 200, y: 175, scale: 0.7, rot: 8 },
            ].map((p, i) => (
              <div key={i} style={{
                position: 'absolute', left: p.x, top: p.y,
                transform: 'scale(' + p.scale + ') rotate(' + p.rot + 'deg)',
                animation: 'aidrobe-float 4s ease-in-out ' + (i*0.3) + 's infinite',
              }}>
                <Garment kind={p.kind} w={120} h={106}/>
              </div>
            ))}
          </div>

          <div>
            <button style={{
              width: '100%', height: 54, borderRadius: 14, background: T_n.ink, color: '#fff',
              border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10,
            }}>使用 Apple 登录</button>
            <button style={{
              width: '100%', height: 44, background: 'transparent', border: 'none', color: T_n.ink3, fontSize: 12, cursor: 'pointer',
            }}>了解隐私政策</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: T_n.mono, fontSize: 11, letterSpacing: 1.2, color: T_n.accent, marginBottom: 12 }}>STEP 02 / 04</div>
          <h2 style={{ fontFamily: T_n.serif, fontSize: 28, fontWeight: 600, color: T_n.ink, margin: 0, lineHeight: 1.2 }}>
            你一般几点出门？
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: T_n.ink3, lineHeight: 1.6 }}>
            我们会在你出门前 90 分钟提前算好今天的方案，打开就能看。
          </p>

          {/* Time picker */}
          <div style={{ marginTop: 32, padding: 24, background: T_n.card, borderRadius: 18, boxShadow: T_n.shadowSm, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: T_n.serif, fontSize: 64, fontWeight: 600, color: T_n.ink, letterSpacing: '-0.03em' }}>08</span>
              <span style={{ fontFamily: T_n.serif, fontSize: 64, fontWeight: 300, color: T_n.ink3 }}>:</span>
              <span style={{ fontFamily: T_n.serif, fontSize: 64, fontWeight: 600, color: T_n.ink, letterSpacing: '-0.03em' }}>30</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: T_n.ink3 }}>工作日 · 可分别设置</div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['07:30','08:00','08:30','09:00','09:30'].map(t => (
              <button key={t} style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13,
                background: t === '08:30' ? T_n.ink : 'transparent',
                color: t === '08:30' ? '#fff' : T_n.ink2,
                border: '1px solid ' + (t === '08:30' ? T_n.ink : T_n.divider),
                cursor: 'pointer', fontFamily: T_n.mono,
              }}>{t}</button>
            ))}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button style={{ width: '100%', height: 54, borderRadius: 14, background: T_n.ink, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>下一步</button>
            <button style={{ width: '100%', height: 44, background: 'transparent', border: 'none', color: T_n.ink3, fontSize: 12, cursor: 'pointer', marginTop: 6 }}>跳过</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: T_n.mono, fontSize: 11, letterSpacing: 1.2, color: T_n.accent, marginBottom: 12 }}>STEP 03 / 04</div>
          <h2 style={{ fontFamily: T_n.serif, fontSize: 28, fontWeight: 600, color: T_n.ink, margin: 0, lineHeight: 1.2 }}>
            选 3 个标签<br/>帮我了解你的风格
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: T_n.ink3 }}>之后可以随时调整或上传灵感图。</p>

          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { t: '极简通勤', s: true }, { t: '韩系松弛', s: false }, { t: '都市精致', s: true },
              { t: '黑白灰', s: true }, { t: '低饱和米咖', s: false }, { t: '柔和奶系', s: false },
              { t: '直筒裤', s: false }, { t: 'oversized', s: false }, { t: '修身利落', s: false },
              { t: '复古学院', s: false }, { t: '舒适优先', s: false }, { t: '会议正式', s: false },
            ].map((tag, i) => (
              <button key={i} style={{
                padding: '10px 14px', borderRadius: 999, fontSize: 13,
                background: tag.s ? T_n.ink : 'transparent',
                color: tag.s ? '#fff' : T_n.ink2,
                border: '1px solid ' + (tag.s ? T_n.ink : T_n.divider),
                cursor: 'pointer',
              }}>{tag.t}{tag.s && ' ✓'}</button>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div style={{ fontSize: 11, color: T_n.ink3, marginBottom: 10, textAlign: 'center' }}>已选 3 / 推荐 ≥ 3</div>
            <button style={{ width: '100%', height: 54, borderRadius: 14, background: T_n.ink, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>下一步</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ flex: 1, padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: T_n.mono, fontSize: 11, letterSpacing: 1.2, color: T_n.accent, marginBottom: 12 }}>STEP 04 / 04</div>
          <h2 style={{ fontFamily: T_n.serif, fontSize: 28, fontWeight: 600, color: T_n.ink, margin: 0, lineHeight: 1.2 }}>
            录入 3 件就<br/>能开始推荐
          </h2>
          <p style={{ marginTop: 8, fontSize: 13, color: T_n.ink3, lineHeight: 1.6 }}>
            一件上衣 + 一件下装 + 一双鞋 — 我们就能给你今天的方案。
          </p>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { kind: 'shirt', t: '上衣', s: '衬衫 / T 恤 / 针织', done: true },
              { kind: 'trousers', t: '下装', s: '裤子 / 半裙', done: true },
              { kind: 'loafer', t: '鞋', s: '通勤鞋款', done: false },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                background: T_n.card, borderRadius: 14, boxShadow: T_n.shadowSm,
              }}>
                <div style={{ width: 56, height: 56, background: T_n.cardInner, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Garment kind={row.kind} w={48} h={42}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T_n.ink, marginBottom: 2 }}>{row.t}</div>
                  <div style={{ fontSize: 11, color: T_n.ink3 }}>{row.s}</div>
                </div>
                {row.done ? (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3F8060', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 11 11"><path d="M2 5.5l2 2L9 2.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ) : (
                  <button style={{
                    padding: '7px 14px', borderRadius: 999, background: T_n.ink, color: '#fff',
                    border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>添加</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button style={{
              width: '100%', height: 54, borderRadius: 14,
              background: T_n.ink4, color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'not-allowed',
            }}>开始用 Aidrobe（还差 1 件）</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// OUTFIT DETAIL — full breakdown w/ swap, fit, location
// ════════════════════════════════════════════════════════════════════
function OutfitDetailScreen({ onBack }) {
  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>

      {/* Top bar */}
      <div style={{ padding: '6px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_n.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke={T_n.ink2} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 9V1" stroke={T_n.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <button style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="3" r="1" fill={T_n.ink2}/><circle cx="7" cy="7" r="1" fill={T_n.ink2}/><circle cx="7" cy="11" r="1" fill={T_n.ink2}/></svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 100px' }}>
        <div style={{ fontFamily: T_n.mono, fontSize: 11, color: T_n.accent, letterSpacing: 1, marginBottom: 4 }}>SAFE · 最稳妥</div>
        <h1 style={{ fontFamily: T_n.serif, fontSize: 26, fontWeight: 600, color: T_n.ink, margin: 0, lineHeight: 1.25 }}>
          通勤 · 黑白经典
        </h1>

        {/* Obstacle banner — A2 differentiator */}
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 14,
          background: '#F4E8D1', border: '1px solid #E5D2A8',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#C8924A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v8M7 12.5v.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#5C4F3F', marginBottom: 4 }}>
              黑色西裤在脏衣篮 · 换一件 30 秒解决
            </div>
            <div style={{ fontSize: 11, color: '#7A6A55', lineHeight: 1.55, marginBottom: 8 }}>
              你昨天穿过、还没洗。可以替换为「灰色羊毛西裤」（M · regular · 主衣柜抽屉 1）— 整体造型不变。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '6px 12px', background: T_n.ink, color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 4l2-2 2 2M4 2v8M10 8l-2 2-2-2M8 10V2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                自动替换
              </button>
              <button style={{
                padding: '6px 12px', background: 'transparent', color: '#7A6A55', border: '1px solid #D4B687',
                borderRadius: 8, fontSize: 11, cursor: 'pointer',
              }}>仍然穿这件</button>
            </div>
          </div>
        </div>

        {/* Score row */}
        <div style={{ marginTop: 14, display: 'flex', gap: 14, padding: '14px 16px', background: T_n.card, borderRadius: 14, boxShadow: T_n.shadowSm }}>
          {[
            { l: '美感', v: '88', max: '100' },
            { l: '执行性', v: '74', max: '100', warn: true },
            { l: '合身度', v: '90', max: '100' },
            { l: '准备时间', v: '12′', max: null, warn: true },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: T_n.serif, fontSize: 22, fontWeight: 600, color: s.warn ? '#B85C4A' : T_n.ink, lineHeight: 1 }}>
                  {s.v}{s.max && <span style={{ fontSize: 11, color: T_n.ink4, fontWeight: 400 }}> / {s.max}</span>}
                </div>
                <div style={{ fontSize: 10, color: T_n.ink3, marginTop: 4 }}>{s.l}</div>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1, background: T_n.divider }}/>}
            </React.Fragment>
          ))}
        </div>

        {/* Hero canvas */}
        <div style={{
          marginTop: 14, height: 360, background: T_n.card, borderRadius: 18,
          boxShadow: T_n.shadowSm, position: 'relative', overflow: 'hidden',
        }}>
          {[
            { kind: 'shirt', x: 36, y: 30, scale: 1.2 },
            { kind: 'blazer', x: 165, y: 18, scale: 1.3 },
            { kind: 'trousers', x: 90, y: 175, scale: 1.1 },
            { kind: 'loafer', x: 195, y: 250, scale: 0.85 },
          ].map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'scale(' + p.scale + ')' }}>
              <Garment kind={p.kind} w={120} h={106}/>
            </div>
          ))}
          {/* Reason quote anchored */}
          <div style={{
            position: 'absolute', left: 16, bottom: 16, right: 16,
            padding: '10px 12px', background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)', borderRadius: 10,
            fontSize: 11, color: T_n.ink2, lineHeight: 1.5,
          }}>
            “延续了你常穿的黑白通勤风格。所有单品都在主衣柜，无需熨烫。”
          </div>
        </div>

        {/* Items list — each can be swapped */}
        <div style={{ marginTop: 18, fontSize: 12, color: T_n.ink3, marginBottom: 8, letterSpacing: 0.4 }}>这套包含 4 件单品</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { kind: 'shirt', t: '白色棉质衬衫', sub: 'M · regular · 主衣柜 抽屉 2', loc: '主衣柜', fit: '合身' },
            { kind: 'blazer', t: '米色西装外套', sub: 'M · oversized · 主衣柜 挂区', loc: '主衣柜', fit: '合身' },
            { kind: 'trousers', t: '黑色直筒西裤', sub: 'M · straight · 昨天已穿，待洗', loc: '脏衣篮', fit: '合身', status: 'laundry' },
            { kind: 'loafer', t: '黑色乐福鞋', sub: '37 · 玄关鞋柜', loc: '玄关', fit: '舒适' },
          ].map((it, i) => (
            <div key={i} style={{
              background: T_n.card, borderRadius: 14, padding: 12,
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: T_n.shadowSm,
              border: it.status === 'laundry' ? '1px solid #E5D2A8' : 'none',
              opacity: it.status === 'laundry' ? 0.85 : 1,
              position: 'relative',
            }}>
              <div style={{
                width: 56, height: 56, background: T_n.cardInner, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <Garment kind={it.kind} w={48} h={42}/>
                {it.status === 'laundry' && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(245,239,230,0.55)',
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="#C8924A" strokeWidth="1.6"/>
                      <path d="M6 10c0-2 2-4 4-4M14 10c0 2-2 4-4 4" stroke="#C8924A" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T_n.ink, marginBottom: 2 }}>{it.t}</div>
                <div style={{ fontSize: 10, color: T_n.ink3, marginBottom: 4 }}>{it.sub}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {it.status === 'laundry' ? (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 999,
                      background: '#F4E8D1', color: '#7A5C2F', fontWeight: 600,
                    }}>待洗</span>
                  ) : (
                    <Tag style={{ fontSize: 9, padding: '2px 6px' }}>{it.fit}</Tag>
                  )}
                  <Tag style={{ fontSize: 9, padding: '2px 6px' }}>{it.loc}</Tag>
                </div>
              </div>
              <button style={{
                padding: '6px 10px',
                background: it.status === 'laundry' ? T_n.ink : T_n.bgAlt,
                color: it.status === 'laundry' ? '#fff' : T_n.ink2,
                border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 4l2-2 2 2M4 2v8M10 8l-2 2-2-2M8 10V2" stroke={it.status === 'laundry' ? '#fff' : T_n.ink2} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                替换
              </button>
            </div>
          ))}
        </div>

        {/* Care + actions */}
        <div style={{ marginTop: 14, padding: 14, background: T_n.cardSoft, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T_n.ink2 }}>取衣与准备</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag>① 主衣柜抽屉 2 取衬衫</Tag>
            <Tag>② 挂区取西装</Tag>
            <Tag>③ 玄关鞋柜取乐福鞋</Tag>
            <Tag>无需熨烫</Tag>
            <Tag>预计 8 分钟</Tag>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 24px', background: 'linear-gradient(to top, ' + T_n.bg + ' 70%, transparent)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            width: 54, height: 54, borderRadius: 14, background: T_n.card, border: 'none',
            boxShadow: T_n.shadowSm, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 18s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0117 8c0 5.5-7 10-7 10z" stroke={T_n.ink2} strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
          </button>
          <button style={{
            flex: 1, height: 54, borderRadius: 14, background: T_n.ink, color: '#fff', border: 'none',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            今天穿这套
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7h8M7 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ITEM DETAIL — single garment w/ fit, wear log, mini calendar
// ════════════════════════════════════════════════════════════════════
function ItemDetailScreen({ onBack }) {
  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_n.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 4h8M5 4V2.5h4V4M4 4l1 8h4l1-8" stroke={T_n.ink2} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
        {/* Hero */}
        <div style={{ height: 280, background: T_n.card, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm, marginBottom: 18 }}>
          <Garment kind="shirt" w={200} h={220}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: T_n.serif, fontSize: 24, fontWeight: 600, color: T_n.ink, margin: 0 }}>白色棉质衬衫</h1>
            <div style={{ marginTop: 6, fontSize: 12, color: T_n.ink3 }}>购于 2025-09 · UNIQLO · ¥299</div>
          </div>
          <StatusPill kind="ok"/>
        </div>

        {/* Specs grid */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: '品类', v: '上衣 / 衬衫' },
            { l: '颜色', v: '白色 · 米白' },
            { l: '尺码', v: 'M · CN' },
            { l: '版型', v: 'regular' },
            { l: '材质', v: '棉 100%' },
            { l: '存放位置', v: '主衣柜抽屉 2' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 12px', background: T_n.card, borderRadius: 10, boxShadow: T_n.shadowSm }}>
              <div style={{ fontSize: 10, color: T_n.ink3, marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 13, color: T_n.ink, fontWeight: 500 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Fit panel */}
        <div style={{ marginTop: 14, padding: 14, background: T_n.card, borderRadius: 14, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>合身度</span>
            <span style={{ fontSize: 10, color: T_n.ink3 }}>2 周前确认</span>
          </div>
          <div style={{ position: 'relative', height: 6, background: T_n.divider, borderRadius: 3, marginBottom: 14 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: T_n.accent, borderRadius: 3 }}/>
            <div style={{ position: 'absolute', left: '50%', top: -5, transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '2px solid '+T_n.accent }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T_n.ink3 }}>
            <span>偏紧</span><span style={{ color: T_n.ink, fontWeight: 600 }}>合身</span><span>偏松</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: T_n.ink2 }}>这件最近穿起来怎么样？</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['合身','偏紧','偏松','需要修改'].map((t, i) => (
              <button key={i} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11,
                background: i === 0 ? T_n.bgAlt : 'transparent',
                color: T_n.ink2, border: '1px solid ' + (i === 0 ? T_n.ink : T_n.divider), cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Wear log */}
        <div style={{ marginTop: 14, padding: 14, background: T_n.card, borderRadius: 14, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>穿着记录</span>
            <span style={{ fontSize: 11, color: T_n.ink3 }}>共 14 次 · ¥21 / 次</span>
          </div>
          {/* mini heatmap 5 rows x 14 cols */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 3, marginBottom: 10 }}>
            {Array.from({length: 60}).map((_, i) => {
              const intensity = [0,0,0,1,0,0,2,0,0,3,0,2,0,0,1,0,3,0,2,0,0,1,0,0,2,0,0,0,3,0,1,0,0,2,0,0,3,0,0,0,1,0,0,2,3,0,0,1,0,2,0,0,3,0,0,2,0,1,3,0][i];
              const colors = [T_n.divider, '#E8DDC9', T_n.accent, T_n.ink];
              return <div key={i} style={{ aspectRatio: '1/1', borderRadius: 2, background: colors[intensity] }}/>;
            })}
          </div>
          <div style={{ fontSize: 10, color: T_n.ink3, display: 'flex', justifyContent: 'space-between' }}>
            <span>近 60 天</span>
            <span>最近一次：3 天前 · 通勤</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// INSIGHTS — Whering-style data deep dive
// ═════════════════════════════════════════════════════════════════
function YearHeatmap() {
  // 53 weeks × 7 days
  const cells = [];
  // Use a stable pseudo-random pattern (seasonal)
  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      // weekends often less worn; recent months (last 12 weeks) more dense
      const recent = w >= 41;
      const wknd = d >= 5;
      const noise = (Math.sin(idx * 1.7) + 1) / 2;
      let v;
      if (recent) v = noise > 0.35 ? (noise > 0.7 ? 4 : 3) : (noise > 0.15 ? 2 : 0);
      else if (w < 4) v = 0;
      else v = wknd ? (noise > 0.7 ? 1 : 0) : (noise > 0.55 ? 2 : (noise > 0.3 ? 1 : 0));
      cells.push(v);
    }
  }
  const colors = ['#EAE2D2', '#EAE0CC', '#C8B388', '#B08D5B', '#1A1714'];
  const months = ['11','12','1','2','3','4','5','6','7','8','9','10'];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#A7A09A', marginBottom: 4, padding: '0 4px' }}>
        {months.map((m, i) => <span key={i}>{m}月</span>)}
      </div>
      <svg viewBox="0 0 530 76" style={{ width: '100%', display: 'block' }}>
        {cells.map((v, i) => {
          const w = Math.floor(i / 7);
          const d = i % 7;
          return <rect key={i} x={w * 10} y={d * 10.4} width="8.5" height="8.5" rx="1.5" fill={colors[v]}/>;
        })}
      </svg>
    </div>
  );
}

function ColorWheel() {
  // Donut wedges sized by share
  const data = [
    { c: '#1A1714', v: 32 },
    { c: '#F5EFE6', v: 24 },
    { c: '#9C9088', v: 18 },
    { c: '#C4A881', v: 14 },
    { c: '#5C4F3F', v: 8 },
    { c: '#3F5C73', v: 4 },
  ];
  const total = data.reduce((s, d) => s + d.v, 0);
  const cx = 60, cy = 60, rOuter = 54, rInner = 30;
  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const a0 = angle;
    const a1 = angle + (d.v / total) * Math.PI * 2;
    angle = a1;
    const x0o = cx + rOuter * Math.cos(a0), y0o = cy + rOuter * Math.sin(a0);
    const x1o = cx + rOuter * Math.cos(a1), y1o = cy + rOuter * Math.sin(a1);
    const x0i = cx + rInner * Math.cos(a1), y0i = cy + rInner * Math.sin(a1);
    const x1i = cx + rInner * Math.cos(a0), y1i = cy + rInner * Math.sin(a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const path = `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${rInner} ${rInner} 0 ${large} 0 ${x1i} ${y1i} Z`;
    return <path key={i} d={path} fill={d.c} stroke="#FAF7F0" strokeWidth="1.5"/>;
  });
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {arcs}
      <text x="60" y="58" textAnchor="middle" fontFamily="EB Garamond, serif" fontSize="20" fontWeight="600" fill="#1A1714">6</text>
      <text x="60" y="73" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="8" fill="#A7A09A">主色</text>
    </svg>
  );
}

function InsightsScreen({ onBack }) {
  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_n.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T_n.ink, alignSelf: 'center' }}>衣橱洞察</span>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
        <div style={{ fontFamily: T_n.mono, fontSize: 11, color: T_n.accent, letterSpacing: 1 }}>OCT 2026 · 30 DAYS</div>
        <h1 style={{ fontFamily: T_n.serif, fontSize: 28, fontWeight: 600, color: T_n.ink, margin: '4px 0 18px', lineHeight: 1.2 }}>
          这一个月，你<br/>穿了 22 套出门
        </h1>

        {/* 365-day heatmap */}
        <div style={{ background: T_n.card, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>过去一年的穿着</span>
            <span style={{ fontSize: 10, color: T_n.ink3, fontFamily: T_n.mono }}>284 / 365 天</span>
          </div>
          <YearHeatmap/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 9, color: T_n.ink3 }}>
              <span>少</span>
              {[T_n.divider, '#EAE0CC', '#C8B388', T_n.accent, T_n.ink].map((c, i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: 2, background: c }}/>
              ))}
              <span>多</span>
            </div>
            <span style={{ fontSize: 10, color: T_n.ink3 }}>10月最活跃</span>
          </div>
        </div>

        {/* Color wheel */}
        <div style={{ background: T_n.card, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>色彩画像</span>
            <span style={{ fontSize: 10, color: T_n.ink3 }}>低饱和 · 偏中性</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ColorWheel/>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { c: '#1A1714', l: '黑', v: '32%' },
                { c: '#F5EFE6', l: '米白', v: '24%' },
                { c: '#9C9088', l: '灰', v: '18%' },
                { c: '#C4A881', l: '浅咖', v: '14%' },
                { c: '#5C4F3F', l: '深咖', v: '8%' },
                { c: '#3F5C73', l: '蓝', v: '4%' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 2, background: c.c, border: '0.5px solid '+T_n.divider }}/>
                  <span style={{ fontSize: 11, color: T_n.ink2 }}>{c.l}</span>
                  <span style={{ fontSize: 10, color: T_n.ink3, marginLeft: 'auto', fontFamily: T_n.mono }}>{c.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { l: '采纳率', v: '68%', sub: '↑ 12%' },
            { l: '平均成本', v: '¥18', sub: '/ 次穿' },
            { l: '闲置件数', v: '12', sub: '> 60 天' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: 12, background: T_n.card, borderRadius: 12, boxShadow: T_n.shadowSm }}>
              <div style={{ fontSize: 10, color: T_n.ink3, marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: T_n.serif, fontSize: 22, fontWeight: 600, color: T_n.ink, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 10, color: T_n.accent, marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Most worn */}
        <div style={{ background: T_n.card, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>最常穿单品</span>
            <span style={{ fontSize: 10, color: T_n.ink3 }}>TOP 4</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { kind: 'trousers', t: '黑色西裤', w: 22, max: 22 },
              { kind: 'shirt', t: '白衬衫', w: 14, max: 22 },
              { kind: 'loafer', t: '黑乐福鞋', w: 18, max: 22 },
              { kind: 'sweater', t: '米色针织', w: 8, max: 22 },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: T_n.cardInner, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Garment kind={it.kind} w={32} h={28}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T_n.ink2 }}>{it.t}</span>
                    <span style={{ fontSize: 10, color: T_n.ink3, fontFamily: T_n.mono }}>{it.w}×</span>
                  </div>
                  <div style={{ height: 4, background: T_n.divider, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: ((it.w / it.max) * 100) + '%', background: T_n.ink }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Idle items */}
        <div style={{ background: T_n.card, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T_n.ink }}>闲置 60 天以上</span>
            <span style={{ fontSize: 11, color: T_n.accent }}>处理 12 件 ›</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {['skirt','blazer','sweater','shirt'].map((k, i) => (
              <div key={i} style={{ minWidth: 84, textAlign: 'center' }}>
                <div style={{ height: 84, background: T_n.cardInner, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Garment kind={k} w={64} h={56}/>
                  <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, color: T_n.ink3, background: T_n.bg, padding: '2px 5px', borderRadius: 4, fontFamily: T_n.mono }}>{[78,92,124,68][i]}d</div>
                </div>
                <div style={{ fontSize: 10, color: T_n.ink3, marginTop: 4 }}>{['咖色半裙','灰外套','灰针织','蓝衬衫'][i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Style trend */}
        <div style={{ background: T_n.card, borderRadius: 16, padding: 16, boxShadow: T_n.shadowSm }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T_n.ink, marginBottom: 6 }}>风格关键词变化</div>
          <div style={{ fontSize: 11, color: T_n.ink3, marginBottom: 12 }}>近 3 个月</div>
          <svg width="100%" height="80" viewBox="0 0 280 80">
            <path d="M0 50 Q40 45 80 40 T160 30 T280 22" stroke={T_n.ink} strokeWidth="1.5" fill="none"/>
            <path d="M0 60 Q40 55 80 55 T160 50 T280 48" stroke={T_n.accent} strokeWidth="1.5" fill="none"/>
            <path d="M0 70 Q40 68 80 65 T160 64 T280 60" stroke={T_n.ink4} strokeWidth="1.5" fill="none" strokeDasharray="3 3"/>
          </svg>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: T_n.ink2, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: T_n.ink }}/>极简</span>
            <span style={{ fontSize: 10, color: T_n.ink2, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: T_n.accent }}/>通勤</span>
            <span style={{ fontSize: 10, color: T_n.ink2, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 2, background: T_n.ink4 }}/>休闲</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CALENDAR — outfit history view
// ════════════════════════════════════════════════════════════════════
function CalendarScreen({ onBack }) {
  const days = Array.from({length: 35}).map((_, i) => {
    const day = i - 2; // start offset
    const has = day > 0 && day <= 30 && [3,5,6,8,11,13,14,15,17,19,20,22,24,26,27,28].includes(day);
    const kinds = ['shirt','blazer','sweater','trousers','skirt'];
    const kind = has ? kinds[day % kinds.length] : null;
    return { day: day > 0 && day <= 30 ? day : null, has, kind, today: day === 14 };
  });

  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px 0', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_n.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T_n.ink, alignSelf: 'center' }}>穿搭日历</span>
        <button style={{ width: 40, height: 40, background: T_n.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke={T_n.ink2} strokeWidth="1.4" fill="none"/><path d="M11 11l2 2" stroke={T_n.ink2} strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_n.ink2} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: T_n.serif, fontSize: 22, fontWeight: 600, color: T_n.ink, textAlign: 'center' }}>2026 · 10月</div>
            <div style={{ fontSize: 11, color: T_n.ink3, textAlign: 'center', marginTop: 2 }}>已记录 16 / 30 天</div>
          </div>
          <button style={{ width: 32, height: 32, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke={T_n.ink2} strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Weekdays */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
          {['一','二','三','四','五','六','日'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: T_n.ink3, padding: '6px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((d, i) => (
            <div key={i} style={{
              aspectRatio: '1/1.15',
              background: d.day ? T_n.card : 'transparent',
              borderRadius: 10, padding: 4,
              border: d.today ? '2px solid ' + T_n.ink : 'none',
              boxShadow: d.day ? T_n.shadowSm : 'none',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {d.day && (
                <span style={{ fontSize: 10, color: d.today ? T_n.ink : T_n.ink3, fontWeight: d.today ? 600 : 400, fontFamily: T_n.mono }}>{d.day}</span>
              )}
              {d.has && d.kind && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Garment kind={d.kind} w={28} h={24}/>
                </div>
              )}
              {d.day && !d.has && d.day < 15 && (
                <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: T_n.ink4 }}/>
              )}
            </div>
          ))}
        </div>

        {/* Selected day detail */}
        <div style={{ marginTop: 24, background: T_n.card, borderRadius: 16, padding: 16, boxShadow: T_n.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: T_n.serif, fontSize: 16, fontWeight: 600, color: T_n.ink }}>10月14日 · 周三</div>
              <div style={{ fontSize: 11, color: T_n.ink3, marginTop: 2 }}>多云 · 通勤 · 客户会议</div>
            </div>
            <Tag>SAFE</Tag>
          </div>
          <div style={{ height: 130, background: T_n.cardInner, borderRadius: 12, position: 'relative', marginBottom: 10 }}>
            {[
              { kind: 'shirt', x: 30, y: 8, scale: 0.7 },
              { kind: 'blazer', x: 130, y: 0, scale: 0.75 },
              { kind: 'trousers', x: 70, y: 50, scale: 0.65 },
              { kind: 'loafer', x: 175, y: 80, scale: 0.5 },
            ].map((p, i) => (
              <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'scale(' + p.scale + ')' }}>
                <Garment kind={p.kind} w={80} h={70}/>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag>白衬衫</Tag>
            <Tag>米色西装</Tag>
            <Tag>黑西裤</Tag>
            <Tag>乐福鞋</Tag>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: T_n.ink2, padding: 10, background: T_n.bgAlt, borderRadius: 8 }}>
            “开会被夸利落 ✓” — 自记
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// IMPORT CONFIRM — after photo / link import
// ════════════════════════════════════════════════════════════════════
function ImportConfirmScreen({ onBack }) {
  const [cat, setCat] = React.useState('top');
  const [color, setColor] = React.useState('white');
  const [fit, setFit] = React.useState('regular');
  const [size, setSize] = React.useState('M');
  const [feel, setFeel] = React.useState('unknown');

  return (
    <div style={{ width: '100%', height: '100%', background: T_n.bg, fontFamily: T_n.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M11 3L3 11M3 3l8 8" stroke={T_n.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize: 13, color: T_n.ink2 }}>识别 1 / 1</span>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 100px' }}>
        <h1 style={{ fontFamily: T_n.serif, fontSize: 26, fontWeight: 600, color: T_n.ink, margin: '4px 0 6px', lineHeight: 1.2 }}>
          确认一下识别结果
        </h1>
        <p style={{ fontSize: 12, color: T_n.ink3, margin: '0 0 18px' }}>
          有 92% 把握，但你最了解自己的衣服。
        </p>

        {/* Image w/ AI badge */}
        <div style={{ height: 240, background: T_n.card, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_n.shadowSm, position: 'relative', marginBottom: 18 }}>
          <Garment kind="shirt" w={170} h={190}/>
          <div style={{
            position: 'absolute', top: 12, left: 12, padding: '4px 10px',
            background: 'rgba(26,23,20,0.8)', borderRadius: 999,
            fontSize: 10, color: '#fff', fontFamily: T_n.mono, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9ED9A1' }}/>
            AI · 92% 置信度
          </div>
          <button style={{
            position: 'absolute', bottom: 12, right: 12, width: 36, height: 36,
            borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 12l8-8M9 4h2v2M2 4h2M2 8h2" stroke={T_n.ink2} strokeWidth="1.4" fill="none" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Title field */}
        <div style={{ background: T_n.card, borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: T_n.shadowSm }}>
          <div style={{ fontSize: 11, color: T_n.ink3, marginBottom: 6 }}>名称</div>
          <div style={{ fontFamily: T_n.serif, fontSize: 18, color: T_n.ink, fontWeight: 600 }}>
            白色棉质衬衫
          </div>
          <div style={{ fontSize: 11, color: T_n.ink4, marginTop: 4 }}>点击修改</div>
        </div>

        {/* Category */}
        <FieldGroup label="品类">
          {[
            { id: 'top', l: '上衣' }, { id: 'bottom', l: '下装' },
            { id: 'outerwear', l: '外套' }, { id: 'dress', l: '连衣裙' }, { id: 'shoes', l: '鞋' },
          ].map(o => (
            <ChoiceChip key={o.id} active={cat === o.id} onClick={() => setCat(o.id)}>{o.l}</ChoiceChip>
          ))}
        </FieldGroup>

        <FieldGroup label="主色">
          {[
            { id: 'white', l: '白', c: '#FAFAF7' },
            { id: 'cream', l: '米白', c: '#F5EFE6' },
            { id: 'gray', l: '浅灰', c: '#D4D0CA' },
            { id: 'beige', l: '米咖', c: '#C4A881' },
            { id: 'black', l: '黑', c: '#1A1714' },
          ].map(o => (
            <button key={o.id} onClick={() => setColor(o.id)} style={{
              padding: '7px 12px 7px 8px', borderRadius: 999, fontSize: 12,
              background: color === o.id ? T_n.ink : 'transparent',
              color: color === o.id ? '#fff' : T_n.ink2,
              border: '1px solid ' + (color === o.id ? T_n.ink : T_n.divider), cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: o.c, border: '0.5px solid '+T_n.divider }}/>
              {o.l}
            </button>
          ))}
        </FieldGroup>

        <FieldGroup label="版型">
          {['fitted','regular','relaxed','oversized'].map(o => (
            <ChoiceChip key={o} active={fit === o} onClick={() => setFit(o)}>{o}</ChoiceChip>
          ))}
        </FieldGroup>

        <FieldGroup label="尺码 · 可选">
          {['XS','S','M','L','XL'].map(o => (
            <ChoiceChip key={o} active={size === o} onClick={() => setSize(o)}>{o}</ChoiceChip>
          ))}
        </FieldGroup>

        <FieldGroup label="穿着感 · 这件穿起来怎么样？">
          {[
            { id: 'unknown', l: '还没穿' }, { id: 'fits', l: '合身' },
            { id: 'loose', l: '偏松' }, { id: 'tight', l: '偏紧' },
          ].map(o => (
            <ChoiceChip key={o.id} active={feel === o.id} onClick={() => setFeel(o.id)}>{o.l}</ChoiceChip>
          ))}
        </FieldGroup>

        <div style={{ marginTop: 14, padding: 12, background: T_n.cardSoft, borderRadius: 12, fontSize: 12, color: T_n.ink2, lineHeight: 1.6 }}>
          这件会进入「主衣柜」，状态「可穿」。<br/>
          可在衣物详情里随时调整位置、状态、合身度。
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 24px', background: 'linear-gradient(to top, ' + T_n.bg + ' 70%, transparent)', display: 'flex', gap: 10 }}>
        <button style={{
          flex: 1, height: 50, borderRadius: 14, background: 'transparent',
          color: T_n.ink2, border: '1px solid ' + T_n.divider, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        }}>不是这件，重拍</button>
        <button style={{
          flex: 2, height: 50, borderRadius: 14, background: T_n.ink, color: '#fff', border: 'none',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>保存到衣橱</button>
      </div>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: T_n.ink3, marginBottom: 8, padding: '0 4px', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}
function ChoiceChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 999, fontSize: 12,
      background: active ? T_n.ink : 'transparent',
      color: active ? '#fff' : T_n.ink2,
      border: '1px solid ' + (active ? T_n.ink : T_n.divider),
      cursor: 'pointer', fontFamily: T_n.sans,
    }}>{children}</button>
  );
}

window.OnboardingScreen = OnboardingScreen;
window.OutfitDetailScreen = OutfitDetailScreen;
window.ItemDetailScreen = ItemDetailScreen;
window.InsightsScreen = InsightsScreen;
window.CalendarScreen = CalendarScreen;
window.ImportConfirmScreen = ImportConfirmScreen;
