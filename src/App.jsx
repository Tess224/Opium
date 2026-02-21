import { useState, useEffect, useRef, useCallback } from "react";

// ─── FONTS via style injection ────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime:wght@400;700&family=Space+Mono:wght@400;700&display=swap";
document.head.appendChild(fontLink);

// ─── POSE DEFINITIONS ─────────────────────────────────────────────────────
const POSES = {
  idle: {
    armL: { x1: 50, y1: 70, x2: 18, y2: 100 },
    armR: { x1: 50, y1: 70, x2: 82, y2: 100 },
    legL: { x1: 50, y1: 130, x2: 28, y2: 185 },
    legR: { x1: 50, y1: 130, x2: 72, y2: 185 },
    mouth: "M 42 38 Q 50 44 58 38",
    emotion: "IDLE",
    caption: "waiting for you...",
  },
  talking: {
    armL: { x1: 50, y1: 70, x2: 20, y2: 88 },
    armR: { x1: 50, y1: 70, x2: 76, y2: 94 },
    legL: { x1: 50, y1: 130, x2: 28, y2: 185 },
    legR: { x1: 50, y1: 130, x2: 72, y2: 185 },
    mouth: "M 40 37 Q 50 47 60 37",
    emotion: "TALKING",
    caption: "responding...",
  },
  nodding: {
    armL: { x1: 50, y1: 70, x2: 22, y2: 102 },
    armR: { x1: 50, y1: 70, x2: 78, y2: 102 },
    legL: { x1: 50, y1: 130, x2: 28, y2: 185 },
    legR: { x1: 50, y1: 130, x2: 72, y2: 185 },
    mouth: "M 43 38 Q 50 43 57 38",
    emotion: "LISTENING",
    caption: "i hear you...",
  },
  thinking: {
    armL: { x1: 50, y1: 70, x2: 32, y2: 68 }, // hand on chin
    armR: { x1: 50, y1: 70, x2: 78, y2: 100 },
    legL: { x1: 50, y1: 130, x2: 28, y2: 185 },
    legR: { x1: 50, y1: 130, x2: 72, y2: 185 },
    mouth: "M 44 40 Q 50 37 56 40",
    emotion: "THINKING",
    caption: "hmm...",
  },
  happy: {
    armL: { x1: 50, y1: 70, x2: 10, y2: 78 },
    armR: { x1: 50, y1: 70, x2: 90, y2: 78 },
    legL: { x1: 50, y1: 130, x2: 24, y2: 183 },
    legR: { x1: 50, y1: 130, x2: 76, y2: 183 },
    mouth: "M 40 36 Q 50 48 60 36",
    emotion: "HAPPY!",
    caption: "love that!",
  },
  surprised: {
    armL: { x1: 50, y1: 70, x2: 8, y2: 72 },
    armR: { x1: 50, y1: 70, x2: 92, y2: 72 },
    legL: { x1: 50, y1: 130, x2: 26, y2: 185 },
    legR: { x1: 50, y1: 130, x2: 74, y2: 185 },
    mouth: "M 44 37 Q 50 50 56 37",
    emotion: "WOW",
    caption: "no way!",
  },
  stretching: {
    armL: { x1: 50, y1: 70, x2: 5, y2: 50 },
    armR: { x1: 50, y1: 70, x2: 95, y2: 50 },
    legL: { x1: 50, y1: 130, x2: 20, y2: 190 },
    legR: { x1: 50, y1: 130, x2: 80, y2: 190 },
    mouth: "M 42 38 Q 50 44 58 38",
    emotion: "STRETCHING",
    caption: "lemme stretch...",
  },
};

// ─── MOCK AI RESPONSES ────────────────────────────────────────────────────
const AI_REPLIES = [
  { text: "Oof, sounds like a lot! How are you feeling about it all?", pose: "nodding", speech: "sounds heavy..." },
  { text: "Wait, seriously?! That's actually wild. Tell me more!", pose: "surprised", speech: "no way!" },
  { text: "Haha okay okay, I see you! That's lowkey a win though.", pose: "happy", speech: "yesss!" },
  { text: "Hmm... maybe the key thing here is how you reacted to it?", pose: "thinking", speech: "hmm 🤔" },
  { text: "I feel like this keeps coming up for you. Is it weighing on you?", pose: "nodding", speech: "i hear you..." },
  { text: "Bro that sounds exhausting. You okay? Real talk.", pose: "nodding", speech: "you ok?" },
  { text: "Okay but that's actually hilarious 😅 didn't see that coming", pose: "happy", speech: "lmaooo" },
  { text: "You're allowed to just feel whatever you feel about it, y'know?", pose: "talking", speech: "for real tho" },
];

// ─── LERP HELPER ─────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

// ─── STICKMAN SVG ─────────────────────────────────────────────────────────
function Stickman({ pose, walkProgress, headAnim }) {
  const p = POSES[pose] || POSES.idle;

  // Walk cycle: bob legs during walk
  const walkOffset = Math.sin(walkProgress * 0.4) * 14;
  const legLy2 = walkProgress < 1 ? 185 + walkOffset : p.legL.y2;
  const legRy2 = walkProgress < 1 ? 185 - walkOffset : p.legR.y2;

  // Head transform per animation
  const headStyle = (() => {
    switch (headAnim) {
      case "talking":  return { animation: "headTalk 0.4s ease-in-out infinite alternate", transformOrigin: "50px 28px" };
      case "nodding":  return { animation: "nod 0.55s ease-in-out infinite", transformOrigin: "50px 28px" };
      case "idle":     return { animation: "headBob 2s ease-in-out infinite", transformOrigin: "50px 28px" };
      default:         return {};
    }
  })();

  return (
    <svg viewBox="0 0 100 220" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <style>{`
        @keyframes headBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes headTalk { from{transform:rotate(-4deg)} to{transform:rotate(4deg)} }
        @keyframes nod      { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(6px) rotate(9deg)} }
      `}</style>

      {/* HEAD GROUP */}
      <g style={headStyle}>
        <circle cx="50" cy="28" r="22" fill="none" stroke="#1a1a1a" strokeWidth="3" />
        {/* Glasses */}
        <rect x="33" y="23" width="13" height="9" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2.2" />
        <rect x="54" y="23" width="13" height="9" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="2.2" />
        <line x1="46" y1="27" x2="54" y2="27" stroke="#1a1a1a" strokeWidth="2" />
        <line x1="33" y1="27" x2="30" y2="26" stroke="#1a1a1a" strokeWidth="2" />
        <line x1="67" y1="27" x2="70" y2="26" stroke="#1a1a1a" strokeWidth="2" />
        {/* Mouth */}
        <path d={p.mouth} fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"
          style={{ transition: "d 0.3s ease" }} />
      </g>

      {/* BODY */}
      <line x1="50" y1="50" x2="50" y2="130" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />

      {/* ARMS */}
      <line {...p.armL} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"
        style={{ transition: "x2 0.4s ease, y2 0.4s ease" }} />
      <line {...p.armR} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"
        style={{ transition: "x2 0.4s ease, y2 0.4s ease" }} />

      {/* LEGS */}
      <line x1="50" y1="130" x2={p.legL.x2} y2={legLy2} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"
        style={{ transition: walkProgress >= 1 ? "x2 0.4s ease, y2 0.4s ease" : "none" }} />
      <line x1="50" y1="130" x2={p.legR.x2} y2={legRy2} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round"
        style={{ transition: walkProgress >= 1 ? "x2 0.4s ease, y2 0.4s ease" : "none" }} />

      {/* FEET */}
      <line x1={p.legL.x2} y1={legLy2} x2={p.legL.x2 - 12} y2={legLy2 + 10} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
      <line x1={p.legR.x2} y1={legRy2} x2={p.legR.x2 + 12} y2={legRy2 + 10} stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── SPEECH BUBBLE ────────────────────────────────────────────────────────
function SpeechBubble({ text, visible }) {
  return (
    <div style={{
      position: "absolute",
      top: "-90px",
      left: "55%",
      background: "#fff9f0",
      border: "2.5px solid #1a1a1a",
      borderRadius: "0 16px 16px 16px",
      padding: "10px 14px",
      fontSize: "12px",
      fontFamily: "'Courier Prime', monospace",
      maxWidth: "180px",
      lineHeight: 1.5,
      boxShadow: "3px 3px 0 #1a1a1a",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(6px) scale(0.92)",
      transition: "all 0.25s ease",
      pointerEvents: "none",
      zIndex: 10,
      whiteSpace: "pre-wrap",
    }}>
      {text}
      {/* tail */}
      <span style={{
        position: "absolute", bottom: "-13px", left: "12px",
        borderWidth: "6px", borderStyle: "solid",
        borderColor: "#1a1a1a transparent transparent transparent",
      }} />
      <span style={{
        position: "absolute", bottom: "-9px", left: "13px",
        borderWidth: "5px", borderStyle: "solid",
        borderColor: "#fff9f0 transparent transparent transparent",
      }} />
    </div>
  );
}

// ─── THINKING DOTS ────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "12px 16px",
      border: "2.5px solid #1a1a1a", borderRadius: "0 16px 16px 16px",
      boxShadow: "3px 3px 0 #1a1a1a", background: "#fff9f0", width: "fit-content" }}>
      <style>{`
        @keyframes think { 0%,100%{transform:translateY(0);opacity:.3} 50%{transform:translateY(-5px);opacity:1} }
      `}</style>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#1a1a1a", display: "inline-block",
          animation: `think 1s ${delay}s infinite`
        }} />
      ))}
    </div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────
function Message({ text, role }) {
  const isUser = role === "user";
  return (
    <div style={{
      maxWidth: "85%", alignSelf: isUser ? "flex-end" : "flex-start",
      animation: "msgIn 0.3s ease",
    }}>
      <style>{`@keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>
      <div style={{
        fontSize: 11, letterSpacing: "2px", textTransform: "uppercase",
        opacity: 0.45, marginBottom: 4, fontFamily: "'Space Mono', monospace",
        textAlign: isUser ? "right" : "left",
      }}>{isUser ? "YOU_" : "BUDDY_"}</div>
      <div style={{
        padding: "12px 16px", fontSize: 13, lineHeight: 1.65,
        border: "2.5px solid #1a1a1a", fontFamily: "'Courier Prime', monospace",
        borderRadius: isUser ? "16px 0 16px 16px" : "0 16px 16px 16px",
        background: isUser ? "#1a1a1a" : "#fff9f0",
        color: isUser ? "#f5f0e8" : "#1a1a1a",
        boxShadow: isUser ? "3px 3px 0 #666" : "3px 3px 0 #1a1a1a",
      }}>{text}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    { id: 0, role: "ai", text: "Hey! Walk in and tell me about your day. I'm all ears 👓" }
  ]);
  const [pose, setPose]         = useState("idle");
  const [headAnim, setHeadAnim] = useState("idle");
  const [speech, setSpeech]     = useState("");
  const [speechVisible, setSpeechVisible] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [input, setInput]       = useState("");
  const [recording, setRecording] = useState(false);
  const [walkProgress, setWalkProgress] = useState(0);
  const [stickX, setStickX]     = useState(-25); // % from left
  const [stickOpacity, setStickOpacity] = useState(0);
  const [emotion, setEmotion]   = useState("IDLE");
  const [caption, setCaption]   = useState("walk on in...");

  const chatRef      = useRef(null);
  const replyIdx     = useRef(0);
  const recognitionRef = useRef(null);

  // ── Walk-in animation ──
  useEffect(() => {
    let prog = 0;
    const interval = setInterval(() => {
      prog += 2.2;
      const t = Math.min(prog / 52, 1);
      setWalkProgress(prog);
      setStickX(lerp(-25, 50, t));
      setStickOpacity(Math.min(t * 3, 1));
      if (t >= 1) {
        clearInterval(interval);
        setWalkProgress(100);
        setPose("idle");
        setHeadAnim("idle");
        setCaption("waiting for you...");
        setTimeout(() => showSpeechBubble("hey! 👋", 2500), 400);
      }
    }, 32);
    return () => clearInterval(interval);
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, thinking]);

  // ── Speech bubble helper ──
  const showSpeechBubble = useCallback((text, duration = 3000) => {
    setSpeech(text);
    setSpeechVisible(true);
    setTimeout(() => setSpeechVisible(false), duration);
  }, []);

  // ── Apply pose ──
  const applyPose = useCallback((poseName) => {
    const p = POSES[poseName] || POSES.idle;
    setPose(poseName);
    setEmotion(p.emotion);
    setCaption(p.caption);
    const animMap = { talking: "talking", nodding: "nodding", idle: "idle", thinking: "idle", happy: "idle", surprised: "idle", stretching: "idle" };
    setHeadAnim(animMap[poseName] || "idle");
  }, []);

  // ── Send message ──
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    setMessages(prev => [...prev, { id: Date.now(), role: "user", text }]);
    applyPose("nodding");
    setThinking(true);

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 900));
    setThinking(false);

    const reply = AI_REPLIES[replyIdx.current % AI_REPLIES.length];
    replyIdx.current++;

    // occasional stretch
    if (replyIdx.current % 4 === 0) {
      applyPose("stretching");
      await new Promise(r => setTimeout(r, 750));
    }

    applyPose(reply.pose);
    showSpeechBubble(reply.speech, 3200);
    setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: reply.text }]);

    setTimeout(() => applyPose("idle"), 3500);
  }, [input, applyPose, showSpeechBubble]);

  // ── Mic ──
  const handleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (!recognitionRef.current) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
        setInput(transcript);
      };
      rec.onend = () => {
        setRecording(false);
        applyPose("idle");
        setInput(prev => { if (prev.trim()) setTimeout(() => handleSend(), 100); return prev; });
      };
      recognitionRef.current = rec;
    }

    if (!recording) {
      recognitionRef.current.start();
      setRecording(true);
      applyPose("nodding");
    } else {
      recognitionRef.current.stop();
    }
  }, [recording, applyPose]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── STYLES ───────────────────────────────────────────────────────────────
  const S = {
    root: {
      minHeight: "100vh",
      background: "#f5f0e8",
      backgroundImage: "radial-gradient(circle, #c9bfa5 1px, transparent 1px)",
      backgroundSize: "28px 28px",
      fontFamily: "'Courier Prime', monospace",
      color: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
    },
    nav: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 32px", borderBottom: "3px solid #1a1a1a",
      background: "#f5f0e8", position: "sticky", top: 0, zIndex: 100,
    },
    logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 4 },
    navStatus: {
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, letterSpacing: 2, textTransform: "uppercase",
      border: "2px solid #1a1a1a", padding: "6px 14px",
    },
    stage: {
      display: "grid",
      gridTemplateColumns: "1fr 420px",
      flex: 1,
    },
    canvasArea: {
      borderRight: "3px solid #1a1a1a",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      padding: 24, position: "relative",
      overflow: "hidden", minHeight: 600,
    },
    chatPanel: {
      display: "flex", flexDirection: "column", background: "#fff9f0",
    },
    panelHeader: {
      padding: "20px 24px", borderBottom: "3px solid #1a1a1a",
      fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3,
      display: "flex", justifyContent: "space-between", alignItems: "center",
    },
    chatLog: {
      flex: 1, overflowY: "auto", padding: 20,
      display: "flex", flexDirection: "column", gap: 16,
      maxHeight: "calc(100vh - 240px)",
    },
    inputArea: {
      borderTop: "3px solid #1a1a1a", padding: "16px 20px", background: "#fff9f0",
    },
    inputRow: { display: "flex", gap: 10, alignItems: "center" },
    textInput: {
      flex: 1, background: "#f5f0e8", border: "2.5px solid #1a1a1a",
      padding: "12px 16px", fontFamily: "'Courier Prime', monospace",
      fontSize: 13, resize: "none", outline: "none", height: 50, lineHeight: 1.4,
    },
    micBtn: (rec) => ({
      width: 50, height: 50, border: `2.5px solid ${rec ? "#c0392b" : "#1a1a1a"}`,
      background: rec ? "#c0392b" : "#1a1a1a", color: "#f5f0e8",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, flexShrink: 0, transition: "all 0.15s",
      animation: rec ? "pulse 0.8s infinite" : "none",
    }),
    sendBtn: {
      padding: "0 20px", height: 50, border: "2.5px solid #1a1a1a",
      background: "#f5f0e8", fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 16, letterSpacing: 2, cursor: "pointer", transition: "all 0.15s",
    },
  };

  return (
    <div style={S.root}>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.logo}>DAYLOG_</div>
        <div style={S.navStatus}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a1a1a", animation: "blink 1.2s infinite" }} />
          COMPANION ONLINE
        </div>
      </nav>

      <div style={S.stage}>
        {/* ── STICKMAN STAGE ── */}
        <div style={S.canvasArea}>
          {/* scene label */}
          <div style={{ position: "absolute", top: 20, left: 20, fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 13, letterSpacing: 3, border: "2px solid #1a1a1a", padding: "4px 10px", background: "#f5f0e8" }}>
            STAGE_01
          </div>

          {/* emotion tag */}
          <div style={{ position: "absolute", top: 20, right: 20, fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 15, letterSpacing: 2, border: "2.5px solid #1a1a1a", padding: "4px 12px",
            background: "#1a1a1a", color: "#f5f0e8", minWidth: 80, textAlign: "center", transition: "all 0.3s" }}>
            {emotion}
          </div>

          {/* ground */}
          <div style={{ width: "100%", height: 3, background: "#1a1a1a", position: "absolute", bottom: 120, left: 0 }} />

          {/* action caption */}
          <div style={{ position: "absolute", bottom: 80, width: "100%", textAlign: "center",
            fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.45,
            fontFamily: "'Space Mono', monospace" }}>
            {caption}
          </div>

          {/* stickman container */}
          <div style={{
            position: "absolute", bottom: 123,
            left: `${stickX}%`,
            transform: "translateX(-50%)",
            width: 160, height: 320,
            opacity: stickOpacity,
            transition: walkProgress >= 100 ? "none" : "none",
          }}>
            <SpeechBubble text={speech} visible={speechVisible} />
            <Stickman pose={pose} walkProgress={walkProgress} headAnim={headAnim} />
          </div>

          {/* decorative rule marks */}
          <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 120, opacity: 0.1 }}
            viewBox="0 0 400 120">
            <line x1="0" y1="60" x2="400" y2="60" stroke="#1a1a1a" strokeWidth="1" />
            {[100, 200, 300].map(x => (
              <line key={x} x1={x} y1="50" x2={x} y2="70" stroke="#1a1a1a" strokeWidth="1.5" />
            ))}
          </svg>
        </div>

        {/* ── CHAT PANEL ── */}
        <div style={S.chatPanel}>
          <div style={S.panelHeader}>
            <span>CONVERSATION</span>
            <span style={{ fontSize: 11, fontFamily: "'Space Mono'", fontWeight: 400, opacity: 0.45, letterSpacing: 1 }}>
              VOICE / TEXT
            </span>
          </div>

          <div style={S.chatLog} ref={chatRef}>
            {messages.map(m => <Message key={m.id} text={m.text} role={m.role} />)}
            {thinking && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase",
                  opacity: 0.45, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>BUDDY_</div>
                <ThinkingDots />
              </div>
            )}
          </div>

          <div style={S.inputArea}>
            <div style={S.inputRow}>
              <textarea
                style={S.textInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tell me what happened today..."
              />
              <button style={S.micBtn(recording)} onClick={handleMic} title="Tap to speak">
                {recording ? "⏹" : "🎙"}
              </button>
              <button
                style={S.sendBtn}
                onClick={handleSend}
                onMouseEnter={e => { e.target.style.background = "#1a1a1a"; e.target.style.color = "#f5f0e8"; }}
                onMouseLeave={e => { e.target.style.background = "#f5f0e8"; e.target.style.color = "#1a1a1a"; }}
              >
                SEND →
              </button>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
              opacity: 0.38, marginTop: 8, fontFamily: "'Space Mono', monospace" }}>
              PRESS ENTER OR SEND · MIC FOR VOICE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
