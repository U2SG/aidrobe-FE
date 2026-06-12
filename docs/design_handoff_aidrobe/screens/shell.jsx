// Interactive prototype shell — tab navigation w/ animated transitions

function PrototypeShell() {
  const [tab, setTab] = React.useState('today');
  const [overlay, setOverlay] = React.useState(null); // 'outfit' | 'item' | 'insights' | 'calendar' | 'import'
  const [transitionKey, setTransitionKey] = React.useState(0);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);

  // Listen to nav events posted from inner screens
  React.useEffect(() => {
    const handler = (e) => {
      if (e.detail.type === 'open-overlay') setOverlay(e.detail.target);
      if (e.detail.type === 'open-feedback') setFeedbackOpen(true);
    };
    window.addEventListener('aidrobe-nav', handler);
    return () => window.removeEventListener('aidrobe-nav', handler);
  }, []);

  const go = (newTab) => {
    if (newTab === tab) return;
    setTab(newTab);
    setTransitionKey(k => k + 1);
  };

  return (
    <div style={{ width: '100%', height: '100%', background: window.AidrobeTokens.bg, fontFamily: window.AidrobeTokens.sans, position: 'relative', overflow: 'hidden' }}>
      <div key={transitionKey} style={{
        position: 'absolute', inset: 0,
        animation: 'aidrobe-fade-in 280ms ease-out',
      }}>
        {tab === 'today' && <TodayScreen onTabChange={go}/>}
        {tab === 'wardrobe' && <WardrobeScreen onTabChange={go}/>}
        {tab === 'add' && <AddScreen onTabChange={go}/>}
        {tab === 'style' && <StyleScreen onTabChange={go}/>}
      </div>

      {/* Overlay screens */}
      {overlay && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          animation: 'aidrobe-slide-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}>
          {overlay === 'outfit' && <OutfitDetailScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'swap' && <SwapPanelScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'item' && <ItemDetailScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'link-import' && <LinkImportScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'style-profile' && <StyleProfileScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'fit-feedback' && <FitFeedbackScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'insights' && <InsightsScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'calendar' && <CalendarScreen onBack={() => setOverlay(null)}/>}
          {overlay === 'import' && <ImportConfirmScreen onBack={() => setOverlay(null)}/>}
        </div>
      )}

      {/* Feedback popup */}
      {feedbackOpen && <WearItPopup onClose={() => setFeedbackOpen(false)}/>}
    </div>
  );
}

// "Wear this today" feedback popup
function WearItPopup({ onClose }) {
  const T_p = window.AidrobeTokens;
  const [stage, setStage] = React.useState('confirm'); // 'confirm' | 'done'
  const [feeling, setFeeling] = React.useState(null);

  React.useEffect(() => {
    if (stage === 'done') {
      const t = setTimeout(onClose, 1600);
      return () => clearTimeout(t);
    }
  }, [stage, onClose]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(26,23,20,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'aidrobe-fade-in 200ms ease-out',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: T_p.bg, borderRadius: '24px 24px 0 0',
        padding: '12px 24px 32px',
        animation: 'aidrobe-slide-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: T_p.divider, borderRadius: 2, margin: '0 auto 18px' }}/>

        {stage === 'confirm' && (
          <>
            <h2 style={{ fontFamily: T_p.serif, fontSize: 22, fontWeight: 600, color: T_p.ink, margin: '0 0 6px', lineHeight: 1.25 }}>
              今天就穿这套？
            </h2>
            <p style={{ fontSize: 12, color: T_p.ink3, margin: '0 0 20px', lineHeight: 1.6 }}>
              我们会在你回家时提示记录穿着感受，帮 Aidrobe 更懂你。
            </p>

            {/* Mini outfit preview */}
            <div style={{
              height: 130, background: T_p.card, borderRadius: 14,
              boxShadow: T_p.shadowSm, position: 'relative', marginBottom: 16,
            }}>
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
              <div style={{
                position: 'absolute', top: 10, right: 10,
                fontFamily: T_p.mono, fontSize: 9, color: T_p.accent, letterSpacing: 0.8,
                background: T_p.accentBg, padding: '3px 7px', borderRadius: 4,
              }}>SAFE</div>
            </div>

            {/* Quick checklist */}
            <div style={{ marginBottom: 18, padding: 12, background: T_p.cardSoft, borderRadius: 10, fontSize: 12, color: T_p.ink2, lineHeight: 1.7 }}>
              <div>✓ 4 件均在主衣柜</div>
              <div>✓ 无需熨烫 · 8 分钟可出门</div>
              <div style={{ color: T_p.accent, marginTop: 4 }}>· 距 8:30 还有 38 分钟</div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, height: 50, borderRadius: 14, background: 'transparent',
                color: T_p.ink2, border: '1px solid ' + T_p.divider,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}>再看看</button>
              <button onClick={() => setStage('done')} style={{
                flex: 2, height: 50, borderRadius: 14, background: T_p.ink, color: '#fff',
                border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>确认，今天穿这套</button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#3F8060', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'aidrobe-pop 400ms cubic-bezier(0.2, 0.9, 0.4, 1.4)',
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <path d="M6 14l5 5L22 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: T_p.serif, fontSize: 22, fontWeight: 600, color: T_p.ink, margin: '0 0 4px' }}>
              今天就这套
            </h2>
            <p style={{ fontSize: 12, color: T_p.ink3, margin: 0 }}>
              已加入今日衣橱 · 晚上回家见。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

window.PrototypeShell = PrototypeShell;
