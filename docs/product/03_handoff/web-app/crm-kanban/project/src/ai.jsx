// AI Input Modal + AI Confirm Card

const AIInputModal = ({ open, onClose, onConfirm }) => {
  const [state, setState] = React.useState("input"); // input | processing | confirm
  const [input, setInput] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [recordSecs, setRecordSecs] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setState("input"); setInput(""); setRecording(false); setRecordSecs(0);
  }, [open]);

  React.useEffect(() => {
    if (!recording) return;
    const i = setInterval(() => setRecordSecs(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [recording]);

  const handleSubmit = () => {
    setState("processing");
    setTimeout(() => setState("confirm"), 3500);
  };

  const handleConfirm = () => {
    onConfirm && onConfirm();
    onClose();
  };

  const demoInput = "剛跟台積電王協理開完會，他對 ESG 模組很有興趣，下週三約 POC。另外他介紹了採購部小李給我，說要寄產品型錄。預計報價金額 280 萬。";

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(26,26,26,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 640, maxHeight: "90vh",
        background: "#fff", borderRadius: 20,
        boxShadow: "0 30px 90px rgba(0,0,0,0.25)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 90px rgba(0,0,0,0.25)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #06C755 0%, #0A84FF 100%)",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
        }} />
        {/* Header */}
        <div style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid rgba(60,74,60,0.08)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, #06C755, #0A84FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}>
            <IconSparkles size={16} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="display-font" style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>
              AI 快速記錄
            </div>
            <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7 }}>
              說出或貼上拜訪紀錄，AI 自動整理為案件、聯絡人與待辦
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, color: "#3C4A3C", opacity: 0.6 }}>
            <IconX size={18} />
          </button>
        </div>

        {state === "input" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 700, color: "#3C4A3C",
                letterSpacing: "0.06em", textTransform: "uppercase",
                marginBottom: 8, opacity: 0.8,
              }}>
                貼上或輸入拜訪紀錄
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`例如：${demoInput}`}
                autoFocus
                style={{
                  width: "100%", minHeight: 180, resize: "vertical",
                  background: "#F3F3F8",
                  border: "1px solid transparent",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 14, lineHeight: 1.65,
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "all 150ms",
                }}
                onFocus={(e) => { e.target.style.background = "#fff"; e.target.style.border = "1px solid #06C755"; }}
                onBlur={(e) => { e.target.style.background = "#F3F3F8"; e.target.style.border = "1px solid transparent"; }}
              />
              <div style={{
                display: "flex", alignItems: "center",
                marginTop: 8, fontSize: 11, color: "#3C4A3C", opacity: 0.7,
              }}>
                <span>{input.length} 字</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setInput(demoInput)} style={{ color: "#006E2B", fontWeight: 600 }}>
                  試試範例
                </button>
              </div>
            </div>

            <div style={{
              padding: "10px 12px", borderRadius: 8,
              background: "rgba(10,132,255,0.06)",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 11.5, color: "#3C4A3C",
            }}>
              <IconMic size={14} style={{ color: "#0A84FF", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                <strong style={{ color: "#0A84FF" }}>語音與照片上傳</strong> 將於 Phase 2 推出
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>取消</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={!input.trim()} icon={<IconSparkles size={14} />}>
                送 AI 整理
              </Button>
            </div>
          </div>
        )}

        {state === "processing" && <ProcessingView />}
        {state === "confirm" && <AIConfirmView onConfirm={handleConfirm} onEdit={() => setState("input")} />}
      </div>
    </div>
  );
};

const VoiceWave = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
    {[8, 16, 24, 18, 10, 20, 14].map((h, i) => (
      <div key={i} style={{
        width: 3, height: h, borderRadius: 2,
        background: "#06C755",
        animation: `pulseSoft 1s ease-in-out ${i * 0.1}s infinite alternate`,
      }} />
    ))}
  </div>
);

const ProcessingView = () => {
  const steps = [
    "正在解析語音 / 文字…",
    "正在識別聯絡人與公司…",
    "正在比對 CRM 資料…",
    "正在透過 AI 整理案件進度…",
    "即將完成…",
  ];
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const i = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 700);
    return () => clearInterval(i);
  }, []);
  return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, minHeight: 300 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: "linear-gradient(135deg, #06C755, #0A84FF)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(10,132,255,0.3)",
        position: "relative",
      }}>
        <IconSparkles size={32} strokeWidth={2} className="pulse-soft" />
        <div style={{
          position: "absolute", inset: -6,
          borderRadius: "50%",
          border: "2px solid rgba(6,199,85,0.3)",
          animation: "pulseSoft 1.5s ease-in-out infinite",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="display-font ai-gradient-text" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          AI 正在整理…
        </div>
        <div style={{ fontSize: 13, color: "#3C4A3C", opacity: 0.8, minHeight: 20 }}>
          {steps[step]}
        </div>
      </div>
      <div style={{
        width: "80%", height: 4, borderRadius: 2,
        background: "#F3F3F8", overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${((step + 1) / steps.length) * 100}%`,
          background: "linear-gradient(90deg, #06C755, #0A84FF)",
          transition: "width 600ms ease",
          borderRadius: 2,
        }} />
      </div>
      <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.6 }}>通常需要 5–10 秒</div>
    </div>
  );
};

const AIConfirmView = ({ onConfirm, onEdit }) => (
  <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px", borderRadius: 20,
      background: "rgba(6,199,85,0.1)",
      alignSelf: "flex-start",
    }}>
      <IconCheck size={12} style={{ color: "#06C755" }} strokeWidth={3} />
      <span style={{ fontSize: 12, fontWeight: 700, color: "#006E2B" }}>AI 已整理完成</span>
    </div>

    <div style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.55 }}>
      從你的紀錄中，AI 識別出 <strong>1 個案件更新</strong>、<strong>2 位聯絡人</strong>、<strong>2 項待辦</strong>。請確認：
    </div>

    {/* Deal update */}
    <AICard title="案件更新" icon={<IconBriefcase size={12} />}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#fff", borderRadius: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>台積電</div>
          <div style={{ fontSize: 12, color: "#3C4A3C", opacity: 0.75 }}>預估金額 <span className="tnum" style={{ fontWeight: 700, color: "#1A1A1A" }}>NT$ 2,800,000</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StageBadge stage="0" size="sm" />
          <IconArrowRight size={12} style={{ color: "#006E2B" }} />
          <StageBadge stage="1" size="sm" />
        </div>
      </div>
    </AICard>

    <AICard title="聯絡人" icon={<IconUser size={12} />}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <AIChip avatar="王" name="王文彥" sub="業務協理 · 台積電" existing />
        <AIChip avatar="李" name="採購部 小李" sub="台積電 · 由王協理介紹" />
      </div>
    </AICard>

    <AICard title="待辦" icon={<IconCheckSquare size={12} />}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 8 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(60,74,60,0.3)", borderRadius: 4 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>約台積電 POC 會議</div>
          <span style={{ fontSize: 11, color: "#854D0E", fontWeight: 600 }}>下週三</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 8 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(60,74,60,0.3)", borderRadius: 4 }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>寄產品型錄給小李</div>
          <span style={{ fontSize: 11, color: "#C0000A", fontWeight: 600 }}>今日</span>
        </div>
      </div>
    </AICard>

    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <Button variant="ghost" onClick={onEdit} icon={<IconEdit size={14} />} style={{ flex: 1 }}>編輯</Button>
      <Button variant="primary" onClick={onConfirm} icon={<IconCheck size={14} strokeWidth={2.5} />} style={{ flex: 2 }}>
        確認無誤,儲存
      </Button>
    </div>
  </div>
);

const AICard = ({ title, icon, children }) => (
  <div style={{
    background: "var(--color-ai-surface)",
    borderLeft: "3px solid #0A84FF",
    borderRadius: 10,
    padding: 12,
  }}>
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 10, fontWeight: 700, color: "#0A84FF",
      letterSpacing: "0.06em", textTransform: "uppercase",
      marginBottom: 8,
    }}>
      {icon} {title}
    </div>
    {children}
  </div>
);

const AIChip = ({ avatar, name, sub, existing }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#fff", borderRadius: 8 }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: "#E8F9EE", color: "#006E2B",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 13,
    }}>{avatar}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 11, color: "#3C4A3C", opacity: 0.7 }}>{sub}</div>
    </div>
    {existing
      ? <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#F3F3F8", color: "#3C4A3C", fontWeight: 600 }}>已存在</span>
      : <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "#E8F9EE", color: "#006E2B", fontWeight: 700 }}>+ 新增</span>
    }
  </div>
);

Object.assign(window, { AIInputModal, ProcessingView, AIConfirmView, AICard, AIChip, VoiceWave });
