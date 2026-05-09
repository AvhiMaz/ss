"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { useGame } from "@/hooks/useGame";
import { buildCommitment } from "@/lib/constants";
import styles from "./game.module.css";

// Confetti Component for wins
function Confetti() {
  const [particles, setParticles] = useState<{ id: number; left: string; top: string; delay: string; duration: string; color: string }[]>([]);

  useEffect(() => {
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#fcd34d', '#fbbf24'];
    const p = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${-10 - Math.random() * 20}%`,
      delay: `${Math.random() * 0.5}s`,
      duration: `${1 + Math.random() * 2}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(p);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: '10px',
            height: '10px',
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration} linear ${p.delay} forwards`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// Playing card component with swipe support
function ChoiceCard({
  choice,
  selected,
  disabled,
  onSelect,
  dragX,
}: {
  choice: "Split" | "Steal";
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  dragX: number; // pixels being dragged toward this card (positive = toward)
}) {
  const isSplit = choice === "Split";
  const rank = isSplit ? "A" : "K";
  const baseRotate = isSplit ? -5 : 5;

  // Extra tilt and lift when being dragged toward
  const dragRotate = isSplit ? -dragX * 0.04 : dragX * 0.04;
  const dragLift = Math.abs(dragX) * 0.15;
  const dragScale = 1 + Math.abs(dragX) * 0.001;

  const transform = selected
    ? `rotate(0deg)` // Selected uses CSS !important scale
    : `rotate(${baseRotate + dragRotate}deg) scale(${dragScale}) translateY(${-dragLift}px)`;

  const cardClass = isSplit ? styles.cardSplit : styles.cardSteal;
  const stateClass = selected ? styles.cardSelected : (dragX === 0 ? styles.cardUnselected : "");

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`${styles.card} ${cardClass} ${stateClass}`}
      style={!selected ? {
        transform,
        transition: dragX !== 0 ? "none" : undefined,
        willChange: "transform",
      } : {}}
    >
      <div className={styles.cardRank}>{rank}</div>
      <div className={styles.cardLabel}>{choice}</div>
      <div className={`${styles.cardRank} ${styles.bottom}`}>{rank}</div>
    </button>
  );
}

function GamePageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const seat = Number(searchParams.get("seat")) as 1 | 2 | 0;
  const gameId = id ?? "0";

  const { game, loading, error } = useGame(BigInt(gameId));

  const [pendingChoice, setPendingChoice] = useState<"Split" | "Steal" | null>(null);
  const [nonce] = useState(() => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [autoResolved, setAutoResolved] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const autoCommitFired = useRef(false);

  // Swipe state
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50; // px to trigger selection

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    if (dragX < -SWIPE_THRESHOLD) setPendingChoice("Split");      // swipe left → Split
    else if (dragX > SWIPE_THRESHOLD) setPendingChoice("Steal");  // swipe right → Steal
    setDragX(0);
    touchStartX.current = null;
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-resolve via backend
  useEffect(() => {
    if (!game || autoResolved) return;
    const statusKey = Object.keys(game.status)[0];
    if (statusKey !== "Revealing") return;
    if (!game.player1_choice || !game.player2_choice) return;

    setAutoResolved(true);
    fetch("/api/admin/resolve-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.success) setTxStatus("Resolve error: " + d.error); })
      .catch((e) => setTxStatus("Resolve error: " + e.message));
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    game?.player1_choice,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    game?.player2_choice,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    game && Object.keys(game.status)[0],
    autoResolved,
  ]);

  // Auto-commit when timer hits 0 and player already selected a choice
  useEffect(() => {
    if (!game || autoCommitFired.current || !pendingChoice) return;
    const chatEnd = Number(game.chat_ends_at);
    if (chatEnd <= 0 || now < chatEnd + 2) return;
    const sKey = Object.keys(game.status)[0];
    if (sKey !== "Active" && sKey !== "Committing") return;
    const alreadyCommitted = seat === 1
      ? game.player1_commitment !== null
      : seat === 2
      ? game.player2_commitment !== null
      : true;
    if (alreadyCommitted || !seat) return;

    autoCommitFired.current = true;
    buildCommitment(pendingChoice, nonce).then((commitment) =>
      fetch("/api/game/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, seat, commitment: Array.from(commitment) }),
      }).then((r) => r.json()).then((d) => {
        if (d.success) {
          localStorage.setItem(`nonce-${gameId}`, nonce.toString());
          localStorage.setItem(`choice-${gameId}`, pendingChoice);
        } else {
          setTxStatus("Auto-commit error: " + d.error);
          autoCommitFired.current = false;
        }
      })
    ).catch((e) => {
      setTxStatus("Auto-commit error: " + e.message);
      autoCommitFired.current = false;
    });
  }, [now, pendingChoice, game?.chat_ends_at, game?.status]); // eslint-disable-line

  if (loading) return (
    <div className={styles.loader}>Loading game…</div>
  );
  if (error || !game) return (
    <div className={styles.loader} style={{ color: '#ef4444' }}>Game not found.</div>
  );

  const statusKey = Object.keys(game.status)[0] as string;
  const chatEndsAt = Number(game.chat_ends_at);
  const BUFFER = 2;
  const chatOver = chatEndsAt > 0 && now >= chatEndsAt + BUFFER;
  const secondsLeft = Math.max(0, chatEndsAt - now);
  const isPlayer = seat === 1 || seat === 2;
  const canJoin = statusKey === "WaitingForPlayers" && isPlayer &&
    (seat === 1 ? !game.player1 : !game.player2);

  const myCommitted = seat === 1
    ? game.player1_commitment !== null
    : seat === 2
    ? game.player2_commitment !== null
    : false;

  const myRevealed = seat === 1
    ? game.player1_choice !== null
    : seat === 2
    ? game.player2_choice !== null
    : false;

  const bothRevealed = game.player1_choice !== null && game.player2_choice !== null;
  const solPot = (Number(game.pot) / 1e9).toFixed(2);

  const api = async (path: string, body: object) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  };

  const joinAsSeat = async (s: 1 | 2) => {
    setTxStatus("Joining…");
    try {
      await api("/api/game/join", { gameId, seat: s });
      router.push(`/game/${gameId}?seat=${s}`);
      setTxStatus(null);
    } catch (e: any) { setTxStatus("Error: " + e.message); }
  };

  const commitChoice = async () => {
    if (!pendingChoice) return;
    setTxStatus("Locking in your choice…");
    try {
      const commitment = await buildCommitment(pendingChoice, nonce);
      await api("/api/game/commit", { gameId, seat, commitment: Array.from(commitment) });
      localStorage.setItem(`nonce-${gameId}`, nonce.toString());
      localStorage.setItem(`choice-${gameId}`, pendingChoice);
      setTxStatus(null);
    } catch (e: any) { setTxStatus("Error: " + e.message); }
  };

  const revealChoice = async () => {
    const savedChoice = localStorage.getItem(`choice-${gameId}`);
    const savedNonce = localStorage.getItem(`nonce-${gameId}`);
    if (!savedChoice || !savedNonce) {
      setTxStatus("Missing saved choice — did you commit from this browser?");
      return;
    }
    setTxStatus("Revealing…");
    try {
      await api("/api/game/reveal", { gameId, seat, choice: savedChoice, nonce: savedNonce });
      setTxStatus(null);
    } catch (e: any) { setTxStatus("Error: " + e.message); }
  };

  const shortKey = (k: any) => k ? k.toBase58().slice(0, 6) + "…" : "Waiting…";

  const result = (() => {
    if (statusKey !== "Resolved") return null;
    const p1 = game.player1_choice ? Object.keys(game.player1_choice)[0] : null;
    const p2 = game.player2_choice ? Object.keys(game.player2_choice)[0] : null;
    if (!p1 || !p2) return null;
    const potNum = Number(game.pot) / 1e9;
    const pot = potNum.toFixed(2);
    const halfNum = potNum / 2;
    const half = halfNum.toFixed(2);
    
    let myWinNum = 0;
    if (seat === 1) {
      if (p1 === "Steal" && p2 === "Split") myWinNum = potNum;
      else if (p1 === "Split" && p2 === "Split") myWinNum = halfNum;
    } else if (seat === 2) {
      if (p2 === "Steal" && p1 === "Split") myWinNum = potNum;
      else if (p1 === "Split" && p2 === "Split") myWinNum = halfNum;
    }
    const myWin = isPlayer ? `+${myWinNum.toFixed(2)} SOL` : null;

    if (p1 === "Split" && p2 === "Split") return {
      emoji: "🤝", title: "Both Split!", text: `Each player takes ${half} SOL`,
      you: myWin, isWin: myWinNum > 0
    };
    if (p1 === "Steal" && p2 === "Steal") return {
      emoji: "🏦", title: "Both Stole.", text: "No one wins — house keeps the pot",
      you: myWin, isWin: false
    };
    if (p1 === "Steal") return {
      emoji: "🐍", title: "Player 1 Stole!", text: `Player 1 takes all ${pot} SOL`,
      you: myWin, isWin: seat === 1
    };
    if (p2 === "Steal") return {
      emoji: "🐍", title: "Player 2 Stole!", text: `Player 2 takes all ${pot} SOL`,
      you: myWin, isWin: seat === 2
    };
    return null;
  })();

  // Timer rendering
  const timerDashOffset = 251 * (1 - secondsLeft / 60); // Assuming 60s max for circle animation
  const isDanger = secondsLeft <= 10;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.gameNumber}>Game #{gameId}</h1>
        <p className={styles.potAmount}>{solPot} SOL</p>
        <p className={styles.potLabel}>Total Pot</p>
      </div>

      {/* Players */}
      <div className={styles.playersGrid}>
        {([1, 2] as const).map((s) => {
          const key = s === 1 ? game.player1 : game.player2;
          const isYou = seat === s;
          return (
            <div key={s} className={`${styles.playerBadge} ${isYou ? styles.isYou : ''}`}>
              <span>P{s}</span>
              <span style={{ fontFamily: 'monospace' }}>{shortKey(key)}</span>
              {isYou && <span style={{ fontWeight: 800 }}>YOU</span>}
            </div>
          );
        })}
      </div>

      {/* Card choice UI */}
      {isPlayer && (statusKey === "Active" || statusKey === "Committing") && !myCommitted && (
        <>
          <div
            className={styles.cardsContainer}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <ChoiceCard
              choice="Split"
              selected={pendingChoice === "Split"}
              disabled={false}
              onSelect={() => setPendingChoice(pendingChoice === "Split" ? null : "Split")}
              dragX={dragX < 0 ? Math.abs(dragX) : 0}
            />
            <ChoiceCard
              choice="Steal"
              selected={pendingChoice === "Steal"}
              disabled={false}
              onSelect={() => setPendingChoice(pendingChoice === "Steal" ? null : "Steal")}
              dragX={dragX > 0 ? dragX : 0}
            />
          </div>

          <p className={styles.infoText} style={{ minHeight: '20px' }}>
            {pendingChoice ? `${pendingChoice} Selected` : '← swipe left or right →'}
          </p>

          {/* Countdown */}
          {!chatOver && chatEndsAt > 0 && (
            <div className={styles.timerContainer}>
              <svg className={styles.timerRing} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className={styles.timerCircleBg} />
                <circle 
                  cx="50" cy="50" r="40" 
                  className={`${styles.timerCircleFg} ${isDanger ? styles.danger : ''}`}
                  strokeDasharray="251"
                  strokeDashoffset={timerDashOffset}
                />
              </svg>
              <span className={styles.timerText} style={{ color: isDanger ? '#ef4444' : '#ffffff' }}>
                {secondsLeft}s
              </span>
            </div>
          )}

          {/* Lock in button */}
          {chatOver ? (
            <button
              onClick={commitChoice}
              disabled={!pendingChoice}
              className={`${styles.ctaButton} ${pendingChoice === "Split" ? styles.btnSplit : pendingChoice === "Steal" ? styles.btnSteal : ''}`}
            >
              {pendingChoice ? `Lock in ${pendingChoice}` : "Choose a card"}
            </button>
          ) : (
            <button disabled className={styles.ctaButton}>
              Wait for timer
            </button>
          )}
        </>
      )}

      {/* Waiting state */}
      {myCommitted && !myRevealed && statusKey !== "Revealing" && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p className={styles.statusMessage} style={{ color: '#10b981' }}>✓ Choice locked in. Waiting for opponent...</p>
        </div>
      )}

      {/* Reveal action */}
      {isPlayer && statusKey === "Revealing" && !myRevealed && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button onClick={revealChoice} className={styles.actionButton}>
            Reveal My Choice
          </button>
        </div>
      )}

      {/* Both revealed waiting */}
      {bothRevealed && statusKey === "Revealing" && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p className={styles.statusMessage} style={{ color: '#fcd34d' }}>Resolving game...</p>
        </div>
      )}

      {/* Join game UI */}
      {seat === 0 && statusKey === "WaitingForPlayers" && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
          {([1, 2] as const).map((s) => {
            const taken = s === 1 ? !!game.player1 : !!game.player2;
            return (
              <button
                key={s}
                onClick={() => !taken && joinAsSeat(s)}
                disabled={taken}
                className={styles.actionButton}
                style={taken ? { backgroundColor: '#333', color: '#888' } : {}}
              >
                {taken ? `Seat ${s} taken` : `Join as Player ${s}`}
              </button>
            );
          })}
        </div>
      )}

      {canJoin && (
        <button onClick={() => joinAsSeat(seat as 1 | 2)} className={styles.actionButton} style={{ marginTop: 'auto' }}>
          Join Game
        </button>
      )}

      {/* Status Messages */}
      {txStatus && (
        <div className={styles.statusMessage} style={{ marginTop: 'auto' }}>
          {txStatus}
        </div>
      )}

      {/* Result Overlay */}
      {result && (
        <div className={styles.overlay}>
          {result.isWin && <Confetti />}
          <div className={styles.emojiLarge}>{result.emoji}</div>
          <h2 className={styles.resultTitle}>{result.title}</h2>
          <p className={styles.resultText}>{result.text}</p>
          {result.you && (
            <div className={`${styles.winAmount} ${result.isWin ? styles.positive : styles.zero}`}>
              You: {result.you}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#a1a1aa' }}>Loading…</div>}>
      <GamePageInner />
    </Suspense>
  );
}
