// More screens — swap panel, link import flow, style profile editor, end-of-day fit feedback
const T_m2 = window.AidrobeTokens;

// ════════════════════════════════════════════════════════════════════
// SWAP PANEL — when user taps "替换" on an item in outfit detail
// Bottom sheet w/ alternatives ranked by fit + style + availability
// ════════════════════════════════════════════════════════════════════
function SwapPanelScreen({ onBack }) {
  const [filter, setFilter] = React.useState('best');
  const [selected, setSelected] = React.useState(0);

  const candidates = [
    { kind: 'trousers', t: '灰色羊毛西裤', sub: 'M · regular · 主衣柜抽屉 1', fit: 92, style: 88, prep: 8, why: '同色温 + 同剪裁，整体造型几乎不变', best: true },
    { kind: 'trousers', t: '深咖直筒裤', sub: 'M · straight · 主衣柜抽屉 1', fit: 90, style: 76, prep: 8, why: '与西装色温呼应，更暖一点' },
    { kind: 'jeans', t: '深色直筒牛仔', sub: 'M · 主衣柜抽屉 3', fit: 86, style: 64, prep: 10, why: '更休闲，整体降一档正式度', warn: '与西装风格不一致' },
    { kind: 'skirt', t: '黑色 A 字半裙', sub: 'M · 主衣柜挂区', fit: 88, style: 82, prep: 9, why: '仍是黑色下装，造型更柔' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: T_m2.bg, fontFamily: T_m2.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>

      {/* Top */}
      <div style={{ padding: '6px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M11 3L3 11M3 3l8 8" stroke={T_m2.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize: 13, color: T_m2.ink2, fontWeight: 500 }}>替换 · 黑色西裤</span>
        <div style={{ width: 40 }}/>
      </div>

      {/* Current item being replaced */}
      <div style={{ padding: '8px 24px 14px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 12, background: T_m2.cardSoft, borderRadius: 14 }}>
          <div style={{ width: 56, height: 56, background: T_m2.cardInner, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Garment kind="trousers" w={48} h={42}/>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,239,230,0.55)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="#C8924A" strokeWidth="1.6"/>
                <path d="M6 10c0-2 2-4 4-4M14 10c0 2-2 4-4 4" stroke="#C8924A" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T_m2.ink, marginBottom: 2 }}>原配：黑色直筒西裤</div>
            <div style={{ fontSize: 11, color: T_m2.ink3 }}>待洗 · 改穿这件需先洗</div>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '0 24px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {[
          { id: 'best', l: '最适合' },
          { id: 'fit', l: '合身度优先' },
          { id: 'style', l: '风格相近' },
          { id: 'fast', l: '取衣最快' },
          { id: 'all', l: '全部下装' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap',
            background: filter === f.id ? T_m2.ink : 'transparent',
            color: filter === f.id ? '#fff' : T_m2.ink2,
            border: '1px solid ' + (filter === f.id ? T_m2.ink : T_m2.divider), cursor: 'pointer',
          }}>{f.l}</button>
        ))}
      </div>

      {/* Candidates */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {candidates.map((c, i) => {
            const isSelected = selected === i;
            return (
              <button key={i} onClick={() => setSelected(i)} style={{
                background: T_m2.card, borderRadius: 16, padding: 14,
                border: '2px solid ' + (isSelected ? T_m2.ink : 'transparent'),
                boxShadow: T_m2.shadowSm, cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
              }}>
                {c.best && (
                  <span style={{
                    position: 'absolute', top: -8, right: 14,
                    padding: '3px 10px', background: T_m2.ink, color: '#fff',
                    fontSize: 9, fontFamily: T_m2.mono, letterSpacing: 0.8,
                    borderRadius: 999, fontWeight: 600,
                  }}>BEST MATCH</span>
                )}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 76, height: 76, background: T_m2.cardInner, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Garment kind={c.kind} w={64} h={56}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T_m2.ink, marginBottom: 2 }}>{c.t}</div>
                    <div style={{ fontSize: 10, color: T_m2.ink3, marginBottom: 8 }}>{c.sub}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Score label="合身" v={c.fit}/>
                      <Score label="风格" v={c.style}/>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontFamily: T_m2.mono, fontSize: 10, color: T_m2.ink3 }}>+{c.prep}′</div>
                        <div style={{ fontSize: 9, color: T_m2.ink4 }}>取衣</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: c.warn ? '#B85C4A' : T_m2.ink2,
                  lineHeight: 1.55, padding: '8px 10px',
                  background: c.warn ? '#F0D9D2' : T_m2.bgAlt, borderRadius: 8,
                }}>
                  {c.warn ? '⚠ ' + c.warn : '✓ ' + c.why}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 24px', background: 'linear-gradient(to top, ' + T_m2.bg + ' 70%, transparent)' }}>
        <button style={{
          width: '100%', height: 52, borderRadius: 14, background: T_m2.ink, color: '#fff',
          border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          确认替换为「{candidates[selected].t}」
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7h8M7 3l4 4-4 4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

function Score({ label, v }) {
  const color = v >= 88 ? '#3F8060' : (v >= 75 ? T_m2.accent : T_m2.ink3);
  return (
    <div>
      <div style={{ fontSize: 9, color: T_m2.ink3 }}>{label}</div>
      <div style={{ fontFamily: T_m2.mono, fontSize: 13, fontWeight: 600, color, marginTop: 1 }}>{v}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LINK IMPORT — 小红书 / 得物 / 淘宝 link → preview → confirm
// ════════════════════════════════════════════════════════════════════
function LinkImportScreen({ onBack }) {
  const [stage, setStage] = React.useState('paste'); // paste | parsing | preview

  return (
    <div style={{ width: '100%', height: '100%', background: T_m2.bg, fontFamily: T_m2.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 14 14"><path d="M11 3L3 11M3 3l8 8" stroke={T_m2.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize: 13, color: T_m2.ink2 }}>链接导入</span>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 100px' }}>
        <h1 style={{ fontFamily: T_m2.serif, fontSize: 26, fontWeight: 600, color: T_m2.ink, margin: '0 0 8px', lineHeight: 1.2 }}>
          {stage === 'paste' && '粘贴链接，自动入库'}
          {stage === 'parsing' && '正在识别…'}
          {stage === 'preview' && '识别完成，确认入库'}
        </h1>
        <p style={{ fontSize: 12, color: T_m2.ink3, margin: '0 0 20px', lineHeight: 1.6 }}>
          {stage === 'paste' && '支持淘宝 · 得物 · 小红书 · 京东。从对应 App 复制链接即可。'}
          {stage === 'parsing' && '正在抓取主图、SKU、版型描述并去除背景。'}
          {stage === 'preview' && '不准的地方点一下就能改，与拍照流程一致。'}
        </p>

        {/* Source apps */}
        {stage === 'paste' && (
          <>
            <div style={{ marginBottom: 16, fontSize: 11, color: T_m2.ink3, fontFamily: T_m2.mono, letterSpacing: 0.5 }}>SOURCE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
              {[
                { l: '小红书', c: '#FF2442', a: '红' },
                { l: '得物', c: '#1A1714', a: '得' },
                { l: '淘宝', c: '#FF6E00', a: '淘' },
                { l: '京东', c: '#C82519', a: '京' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: 10, background: T_m2.card, borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  boxShadow: T_m2.shadowSm,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: s.c,
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{s.a}</div>
                  <span style={{ fontSize: 10, color: T_m2.ink2 }}>{s.l}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 8, fontSize: 11, color: T_m2.ink3, fontFamily: T_m2.mono, letterSpacing: 0.5 }}>LINK</div>
            <div style={{
              padding: 14, background: T_m2.card, borderRadius: 14, boxShadow: T_m2.shadowSm,
              border: '1.5px solid ' + T_m2.ink, marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, color: T_m2.ink2, fontFamily: T_m2.mono, lineHeight: 1.5 }}>
                4@{'\u00A0'}https://www.xiaohongshu.com/discovery/<br/>
                item/68a3c2f1...
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: T_m2.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: T_m2.accent }}/>
                检测到小红书笔记 · 第 4 张图 · 米白针织
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button style={{ flex: 1, padding: '10px 12px', background: T_m2.cardSoft, border: 'none', borderRadius: 10, fontSize: 11, color: T_m2.ink2, cursor: 'pointer' }}>
                📎 从剪贴板粘贴
              </button>
              <button style={{ flex: 1, padding: '10px 12px', background: T_m2.cardSoft, border: 'none', borderRadius: 10, fontSize: 11, color: T_m2.ink2, cursor: 'pointer' }}>
                📷 用拍照代替
              </button>
            </div>

            <button onClick={() => { setStage('parsing'); setTimeout(() => setStage('preview'), 1400); }} style={{
              width: '100%', height: 52, borderRadius: 14, background: T_m2.ink, color: '#fff',
              border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>开始识别</button>
          </>
        )}

        {stage === 'parsing' && (
          <div style={{ marginTop: 30 }}>
            {/* Mock card showing progress */}
            <div style={{
              padding: 18, background: T_m2.card, borderRadius: 18, boxShadow: T_m2.shadowSm,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ height: 200, background: T_m2.cardInner, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <Garment kind="sweater" w={150} h={170}/>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, transparent 30%, rgba(176,141,91,0.2) 50%, transparent 70%, transparent 100%)', animation: 'aidrobe-scan 1.6s ease-in-out infinite' }}/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { l: '抓取主图', done: true },
                  { l: '识别品类与颜色', done: true },
                  { l: '去除背景', done: true },
                  { l: '匹配你的尺码偏好', loading: true },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: step.done ? T_m2.ink2 : T_m2.ink3 }}>
                    {step.done ? (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#3F8060', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    ) : (
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: '2px solid ' + T_m2.divider, borderTopColor: T_m2.accent,
                        animation: 'aidrobe-spin 1s linear infinite',
                      }}/>
                    )}
                    <span>{step.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === 'preview' && (
          <div>
            <div style={{ height: 240, background: T_m2.card, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_m2.shadowSm, position: 'relative', marginBottom: 14 }}>
              <Garment kind="sweater" w={170} h={190}/>
              <div style={{
                position: 'absolute', top: 12, left: 12, padding: '4px 10px',
                background: 'rgba(26,23,20,0.8)', borderRadius: 999,
                fontSize: 10, color: '#fff', fontFamily: T_m2.mono, letterSpacing: 0.5,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9ED9A1' }}/>
                来自小红书 · 92% 置信度
              </div>
            </div>

            {/* Source attribution */}
            <div style={{ padding: 12, background: T_m2.cardSoft, borderRadius: 12, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: '#FF2442', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>红</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T_m2.ink, fontWeight: 500 }}>@穿搭小记 · 米白针织 软糯不显胖</div>
                <div style={{ fontSize: 10, color: T_m2.ink3, fontFamily: T_m2.mono }}>xhs · 2.3w 收藏</div>
              </div>
            </div>

            {/* Editable parsed fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: '名称', v: '米白色羊绒针织衫' },
                { l: '品类', v: '上衣 / 针织衫' },
                { l: '主色', v: '米白 · 米咖' },
                { l: '版型', v: 'oversized' },
                { l: '尺码 · 推断', v: 'M（与你已有同品牌相同）' },
                { l: '材质', v: '羊毛 60% · 羊绒 30% · 涤 10%' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: T_m2.card, borderRadius: 12, boxShadow: T_m2.shadowSm }}>
                  <span style={{ fontSize: 11, color: T_m2.ink3 }}>{f.l}</span>
                  <span style={{ fontSize: 12, color: T_m2.ink, fontWeight: 500 }}>{f.v} ›</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#F4E8D1', borderRadius: 10, fontSize: 11, color: '#7A5C2F', lineHeight: 1.6 }}>
              💡 这件还在购物车 — 入库后我们会标记为「计划购入」，能立刻在搭配里试穿（虚拟），但不会出现在「今日穿搭」推荐里。
            </div>
          </div>
        )}
      </div>

      {stage === 'preview' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 24px', background: 'linear-gradient(to top, ' + T_m2.bg + ' 70%, transparent)', display: 'flex', gap: 10 }}>
          <button style={{ flex: 1, height: 50, borderRadius: 14, background: 'transparent', color: T_m2.ink2, border: '1px solid ' + T_m2.divider, fontSize: 13, cursor: 'pointer' }}>计划购入</button>
          <button style={{ flex: 2, height: 50, borderRadius: 14, background: T_m2.ink, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>已拥有 · 加入衣橱</button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STYLE PROFILE EDITOR — adjust learned style weights
// ════════════════════════════════════════════════════════════════════
function StyleProfileScreen({ onBack }) {
  const [palette, setPalette] = React.useState(['#1A1714', '#F5EFE6', '#9C9088', '#C4A881']);

  return (
    <div style={{ width: '100%', height: '100%', background: T_m2.bg, fontFamily: T_m2.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: T_m2.card, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_m2.shadowSm }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke={T_m2.ink} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: T_m2.ink }}>风格画像</span>
        <button style={{ background: 'transparent', border: 'none', color: T_m2.accent, fontSize: 13, cursor: 'pointer' }}>保存</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
        <div style={{ fontFamily: T_m2.mono, fontSize: 11, color: T_m2.accent, letterSpacing: 1 }}>LEARNED FROM 84 OUTFITS</div>
        <h1 style={{ fontFamily: T_m2.serif, fontSize: 26, fontWeight: 600, color: T_m2.ink, margin: '4px 0 6px', lineHeight: 1.2 }}>
          这是你目前的样子
        </h1>
        <p style={{ fontSize: 12, color: T_m2.ink3, margin: '0 0 22px', lineHeight: 1.6 }}>
          滑动下面的权重，告诉我们应该多推什么、少推什么。
        </p>

        {/* Style axes */}
        <SectionTitle>风格倾向</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
          <Axis left="松弛" right="利落" v={0.7}/>
          <Axis left="休闲" right="正式" v={0.55}/>
          <Axis left="保守" right="有造型感" v={0.4}/>
          <Axis left="单色" right="有层次" v={0.3}/>
        </div>

        {/* Palette */}
        <SectionTitle>调色板 · 4 个主色</SectionTitle>
        <div style={{ background: T_m2.card, borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: T_m2.shadowSm }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {palette.map((c, i) => (
              <div key={i} style={{ flex: 1, position: 'relative' }}>
                <div style={{ aspectRatio: '1/1.2', borderRadius: 10, background: c, border: '0.5px solid '+T_m2.divider }}/>
                <span style={{ fontFamily: T_m2.mono, fontSize: 9, color: T_m2.ink3, textAlign: 'center', display: 'block', marginTop: 4 }}>{c}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T_m2.ink3, marginBottom: 8 }}>建议加入 · 基于你最近收藏</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['#5C4F3F', '#3F5C73', '#7A5C2F', '#A7B0A1'].map(c => (
              <button key={c} style={{
                padding: '4px 10px 4px 4px', borderRadius: 999, border: '1px solid ' + T_m2.divider,
                background: 'transparent', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: T_m2.ink2,
              }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: c }}/>
                + 加入
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <SectionTitle>关键词 · 影响推荐</SectionTitle>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
          {[
            { t: '极简通勤', w: 'high' },
            { t: '黑白灰', w: 'high' },
            { t: '低饱和', w: 'mid' },
            { t: '都市精致', w: 'mid' },
            { t: 'oversized', w: 'mid' },
            { t: '直筒裤', w: 'low' },
            { t: '修身利落', w: 'avoid' },
          ].map((tag, i) => (
            <span key={i} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 12,
              background: tag.w === 'avoid' ? '#F0D9D2' : (tag.w === 'high' ? T_m2.ink : (tag.w === 'mid' ? T_m2.bgAlt : 'transparent')),
              color: tag.w === 'avoid' ? '#B85C4A' : (tag.w === 'high' ? '#fff' : T_m2.ink2),
              border: '1px solid ' + (tag.w === 'high' ? T_m2.ink : tag.w === 'avoid' ? '#E5C2BA' : T_m2.divider),
              textDecoration: tag.w === 'avoid' ? 'line-through' : 'none',
            }}>
              {tag.t}
              {tag.w === 'high' && ' ↑'}
              {tag.w === 'avoid' && ' ✕'}
            </span>
          ))}
          <button style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, background: 'transparent', color: T_m2.ink3, border: '1px dashed ' + T_m2.divider, cursor: 'pointer' }}>
            + 添加
          </button>
        </div>

        {/* Inspiration */}
        <SectionTitle>灵感图 · 训练样本</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {['shirt','blazer','sweater','trousers','dress','skirt'].map((k, i) => (
            <div key={i} style={{ aspectRatio: '1/1.15', background: T_m2.card, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T_m2.shadowSm, position: 'relative' }}>
              <Garment kind={k} w={64} h={56}/>
              <span style={{ position: 'absolute', top: 6, right: 6, fontFamily: T_m2.mono, fontSize: 8, color: T_m2.ink3, background: T_m2.bg, padding: '1px 5px', borderRadius: 3 }}>xhs</span>
            </div>
          ))}
          <div style={{ aspectRatio: '1/1.15', background: 'transparent', border: '1.5px dashed '+T_m2.divider, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke={T_m2.ink3} strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: T_m2.mono, fontSize: 11, color: T_m2.ink3, letterSpacing: 0.6, marginBottom: 10 }}>{children}</div>;
}

function Axis({ left, right, v }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T_m2.ink2, marginBottom: 6 }}>
        <span>{left}</span><span>{right}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: T_m2.divider, borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (v * 100) + '%', background: T_m2.ink, borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: 'calc(' + (v*100) + '% - 9px)', top: -7, width: 18, height: 18, borderRadius: '50%', background: '#fff', border: '2px solid '+T_m2.ink, boxShadow: T_m2.shadowSm }}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FIT FEEDBACK — end-of-day, after wearing today's outfit (closes A3 loop)
// ════════════════════════════════════════════════════════════════════
function FitFeedbackScreen({ onBack }) {
  const [overall, setOverall] = React.useState(null);
  const [fitMap, setFitMap] = React.useState({});

  const items = [
    { kind: 'shirt', t: '白色棉质衬衫' },
    { kind: 'blazer', t: '米色西装外套' },
    { kind: 'jeans', t: '深色直筒牛仔' },
    { kind: 'loafer', t: '黑色乐福鞋' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: T_m2.bg, fontFamily: T_m2.sans, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <StatusBar/>
      <div style={{ padding: '6px 16px', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ width: 40, height: 40, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M11 3L3 11M3 3l8 8" stroke={T_m2.ink2} strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <span style={{ fontSize: 13, color: T_m2.ink3, fontFamily: T_m2.mono, alignSelf: 'center' }}>21:48 · 回家了</span>
        <div style={{ width: 40 }}/>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 100px' }}>
        <div style={{ fontFamily: T_m2.mono, fontSize: 11, color: T_m2.accent, letterSpacing: 1, marginBottom: 4 }}>END OF DAY</div>
        <h1 style={{ fontFamily: T_m2.serif, fontSize: 28, fontWeight: 600, color: T_m2.ink, margin: 0, lineHeight: 1.2 }}>
          今天那套穿得<br/>怎么样？
        </h1>
        <p style={{ fontSize: 12, color: T_m2.ink3, margin: '8px 0 22px', lineHeight: 1.6 }}>
          一句话反馈 · Aidrobe 会立刻调整明天的推荐。
        </p>

        {/* Mini outfit recap */}
        <div style={{
          height: 130, background: T_m2.card, borderRadius: 14,
          boxShadow: T_m2.shadowSm, position: 'relative', marginBottom: 22,
        }}>
          {[
            { kind: 'shirt', x: 30, y: 8, scale: 0.7 },
            { kind: 'blazer', x: 130, y: 0, scale: 0.75 },
            { kind: 'jeans', x: 70, y: 50, scale: 0.65 },
            { kind: 'loafer', x: 175, y: 80, scale: 0.5 },
          ].map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'scale(' + p.scale + ')' }}>
              <Garment kind={p.kind} w={80} h={70}/>
            </div>
          ))}
          <div style={{ position: 'absolute', top: 10, right: 10, fontFamily: T_m2.mono, fontSize: 9, color: T_m2.accent, letterSpacing: 0.6, background: T_m2.accentBg, padding: '3px 7px', borderRadius: 4 }}>SAFE</div>
        </div>

        {/* Overall feeling */}
        <div style={{ fontSize: 12, color: T_m2.ink3, marginBottom: 10 }}>整体感觉</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 22 }}>
          {[
            { id: 'love', emoji: '🤍', l: '很喜欢' },
            { id: 'good', emoji: '😊', l: '不错' },
            { id: 'meh', emoji: '😐', l: '一般' },
            { id: 'bad', emoji: '😶‍🌫️', l: '不喜欢' },
          ].map(o => (
            <button key={o.id} onClick={() => setOverall(o.id)} style={{
              padding: '14px 8px', borderRadius: 12, fontSize: 11,
              background: overall === o.id ? T_m2.ink : T_m2.card,
              color: overall === o.id ? '#fff' : T_m2.ink2,
              border: 'none', cursor: 'pointer', boxShadow: T_m2.shadowSm,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 22 }}>{o.emoji}</span>
              {o.l}
            </button>
          ))}
        </div>

        {/* Per-item fit */}
        <div style={{ fontSize: 12, color: T_m2.ink3, marginBottom: 10 }}>有哪件不舒服吗？</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: T_m2.card, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 12, boxShadow: T_m2.shadowSm }}>
              <div style={{ width: 44, height: 44, background: T_m2.cardInner, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Garment kind={it.kind} w={36} h={32}/>
              </div>
              <div style={{ flex: 1, fontSize: 12, color: T_m2.ink, fontWeight: 500 }}>{it.t}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'tight', l: '紧' },
                  { id: 'fit', l: '合身' },
                  { id: 'loose', l: '松' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setFitMap({...fitMap, [i]: opt.id})} style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 11,
                    background: fitMap[i] === opt.id ? T_m2.ink : 'transparent',
                    color: fitMap[i] === opt.id ? '#fff' : T_m2.ink2,
                    border: '1px solid ' + (fitMap[i] === opt.id ? T_m2.ink : T_m2.divider),
                    cursor: 'pointer',
                  }}>{opt.l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick tags */}
        <div style={{ fontSize: 12, color: T_m2.ink3, marginBottom: 10 }}>其他想说的</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['被夸利落','太正式了','下次少穿','适合开会','想多穿这种','配色赞'].map((t, i) => (
            <button key={i} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 11,
              background: 'transparent', color: T_m2.ink2,
              border: '1px solid ' + T_m2.divider, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 24px', background: 'linear-gradient(to top, ' + T_m2.bg + ' 70%, transparent)' }}>
        <button style={{ width: '100%', height: 52, borderRadius: 14, background: T_m2.ink, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          保存反馈 · 影响明天推荐
        </button>
      </div>
    </div>
  );
}

window.SwapPanelScreen = SwapPanelScreen;
window.LinkImportScreen = LinkImportScreen;
window.StyleProfileScreen = StyleProfileScreen;
window.FitFeedbackScreen = FitFeedbackScreen;
