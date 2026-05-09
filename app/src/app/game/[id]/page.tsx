"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { useGame } from "@/hooks/useGame";
import { buildCommitment } from "@/lib/constants";
import styles from "./game.module.css";

// ─── Confetti ─────────────────────────────────────────────────────────────────

type Particle = { id: number; left: string; color: string; delay: string; duration: string; round: boolean };

function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const colors = ["#10b981", "#34d399", "#6ee7b7", "#fcd34d", "#fbbf24"];
    setParticles(
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i / 48) * 100}%`,
        color: colors[i % colors.length],
        delay: `${(i * 0.01).toFixed(2)}s`,
        duration: `${1.2 + (i % 8) * 0.15}s`,
        round: i % 2 === 0,
      }))
    );
  }, []);

  if (!particles.length) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`@keyframes cf{0%{transform:translateY(-10%)rotate(0);opacity:1}100%{transform:translateY(110vh)rotate(400deg);opacity:0}}`}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute", left: p.left, top: "-5%",
            width: 9, height: 9, backgroundColor: p.color,
            borderRadius: p.round ? "50%" : 2,
            animation: `cf ${p.duration} linear ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite", display: "block" }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ChoiceCard({
  choice, selected, dimmed, onSelect, dragX,
}: {
  choice: "Split" | "Steal";
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
  dragX: number;
}) {
  const isSplit = choice === "Split";
  const rank = isSplit ? "A" : "K";
  const baseRotate = isSplit ? -5 : 5;
  const dragRotate = isSplit ? -dragX * 0.04 : dragX * 0.04;
  const dragLift = dragX * 0.15;
  const dragScale = 1 + dragX * 0.001;

  const stateClass = selected ? styles.cardSelected : dimmed ? styles.cardDimmed : styles.cardIdle;

  return (
    <button
      onClick={onSelect}
      className={`${styles.card} ${isSplit ? styles.cardSplit : styles.cardSteal} ${stateClass}`}
      style={
        !selected
          ? { transform: `rotate(${baseRotate + dragRotate}deg) scale(${dragScale}) translateY(${-dragLift}px)`, transition: dragX > 0 ? "none" : undefined }
          : undefined
      }
    >
      <div className={styles.cardRank}>{rank}</div>
      <div className={styles.cardLabel}>{choice}</div>
      <div className={`${styles.cardRank} ${styles.bottom}`}>{rank}</div>
    </button>
  );
}

// ─── Game page ────────────────────────────────────────────────────────────────

function GamePageInner() {
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const seat         = Number(searchParams.get("seat")) as 0 | 1 | 2;
  const gameId       = id ?? "0";

  const { game, loading, error } = useGame(BigInt(gameId));

  const [pendingChoice, setPendingChoice] = useState<"Split" | "Steal" | null>(null);
  const [nonce] = useState(() => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));

  // Loading states
  const [isJoining,  setIsJoining]  = useState(false);
  const [isLocking,  setIsLocking]  = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const [txError, setTxError] = useState<string | null>(null);
  const [autoResolved, setAutoResolved] = useState(false);
  const autoCommitFired = useRef(false);

  // Swipe
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 48;

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  };
  const onTouchEnd = () => {
    if (dragX < -SWIPE_THRESHOLD) setPendingChoice("Split");
    else if (dragX > SWIPE_THRESHOLD) setPendingChoice("Steal");
    setDragX(0);
    touchStartX.current = null;
  };

  // Auto-resolve when both revealed
  useEffect(() => {
    if (!game || autoResolved) return;
    if (Object.keys(game.status)[0] !== "Revealing") return;
    if (!game.player1_choice || !game.player2_choice) return;
    setAutoResolved(true);
    fetch("/api/admin/resolve-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.success) setTxError("Resolve error: " + d.error); })
      .catch((e) => setTxError("Resolve error: " + e.message));
  }, [game?.player1_choice, game?.player2_choice, game && Object.keys(game.status)[0], autoResolved]); // eslint-disable-line

  if (loading) return (
    <div className={styles.loader}>
      <Spinner size={32} color="#6b7280" />
    </div>
  );
  if (error || !game) return (
    <div className={styles.loader} style={{ color: "#ef4444" }}>Game not found.</div>
  );

  const statusKey   = Object.keys(game.status)[0];
  const isPlayer    = seat === 1 || seat === 2;

  const myCommitted = seat === 1 ? game.player1_commitment !== null
                    : seat === 2 ? game.player2_commitment !== null : false;
  const myRevealed  = seat === 1 ? game.player1_choice !== null
                    : seat === 2 ? game.player2_choice !== null : false;
  const bothRevealed = game.player1_choice !== null && game.player2_choice !== null;
  const bothCommitted = game.player1_commitment !== null && game.player2_commitment !== null;

  const solPot   = (Number(game.pot) / 1e9).toFixed(2);
  const shortKey = (k: any) => (k ? k.toBase58().slice(0, 6) + "…" : "—");

  // ── Actions ──────────────────────────────────────────────────────────────

  const joinAsSeat = async (s: 1 | 2) => {
    setIsJoining(true);
    setTxError(null);
    try {
      const res  = await fetch("/api/game/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, seat: s }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Join failed");
      router.push(`/game/${gameId}?seat=${s}`);
    } catch (e: any) { setTxError(e.message); }
    finally { setIsJoining(false); }
  };

  const lockIn = async () => {
    if (!pendingChoice) return;
    setIsLocking(true);
    setTxError(null);
    try {
      const commitment = await buildCommitment(pendingChoice, nonce);
      const res  = await fetch("/api/game/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, seat, commitment: Array.from(commitment) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Commit failed");
      localStorage.setItem(`nonce-${gameId}`,  nonce.toString());
      localStorage.setItem(`choice-${gameId}`, pendingChoice);
    } catch (e: any) { setTxError(e.message); }
    finally { setIsLocking(false); }
  };

  const reveal = async () => {
    const savedChoice = localStorage.getItem(`choice-${gameId}`);
    const savedNonce  = localStorage.getItem(`nonce-${gameId}`);
    if (!savedChoice || !savedNonce) { setTxError("Missing saved choice — did you commit from this browser?"); return; }
    setIsRevealing(true);
    setTxError(null);
    try {
      const res  = await fetch("/api/game/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, seat, choice: savedChoice, nonce: savedNonce }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reveal failed");
    } catch (e: any) { setTxError(e.message); }
    finally { setIsRevealing(false); }
  };

  // ── Result ───────────────────────────────────────────────────────────────

  const result = (() => {
    if (statusKey !== "Resolved") return null;
    const p1 = game.player1_choice ? Object.keys(game.player1_choice)[0] : null;
    const p2 = game.player2_choice ? Object.keys(game.player2_choice)[0] : null;
    if (!p1 || !p2) return null;
    const potN  = Number(game.pot) / 1e9;
    const halfN = potN / 2;
    let myWinN  = 0;
    if      (seat === 1 && p1 === "Steal" && p2 === "Split") myWinN = potN;
    else if (seat === 2 && p2 === "Steal" && p1 === "Split") myWinN = potN;
    else if (p1 === "Split" && p2 === "Split" && isPlayer)   myWinN = halfN;
    const myWin = isPlayer ? `+${myWinN.toFixed(2)} SOL` : null;

    if (p1 === "Split" && p2 === "Split") return { emoji: "🤝", title: "Both Split!",       text: `Each player takes ${halfN.toFixed(2)} SOL`, you: myWin, isWin: myWinN > 0 };
    if (p1 === "Steal" && p2 === "Steal") return { emoji: "🏦", title: "Both Stole.",        text: "No one wins — house keeps the pot",          you: myWin, isWin: false };
    if (p1 === "Steal")                   return { emoji: "🐍", title: "Player 1 Stole!",    text: `Player 1 takes all ${potN.toFixed(2)} SOL`,  you: myWin, isWin: seat === 1 };
    return                                       { emoji: "🐍", title: "Player 2 Stole!",    text: `Player 2 takes all ${potN.toFixed(2)} SOL`,  you: myWin, isWin: seat === 2 };
  })();

  const showCards = isPlayer && (statusKey === "Active" || statusKey === "Committing") && !myCommitted;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <p className={styles.gameNumber}>Game #{gameId}</p>
        <p className={styles.potAmount}>{solPot}</p>
        <p className={styles.potLabel}>SOL · Total Pot</p>
      </div>

      {/* Players */}
      <div className={styles.playersGrid}>
        {([1, 2] as const).map((s) => {
          const key   = s === 1 ? game.player1 : game.player2;
          const isYou = seat === s;
          const committed = s === 1 ? game.player1_commitment !== null : game.player2_commitment !== null;
          return (
            <div key={s} className={`${styles.playerBadge} ${isYou ? styles.isYou : ""}`}>
              <span>P{s}</span>
              <span>{shortKey(key)}</span>
              {isYou && <span className={styles.youTag}>YOU</span>}
              {committed && <span className={styles.lockedTag}>🔒</span>}
            </div>
          );
        })}
      </div>

      {/* ── Choice cards ── */}
      {showCards && (
        <>
          <div
            className={styles.cardsContainer}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <ChoiceCard
              choice="Split"
              selected={pendingChoice === "Split"}
              dimmed={pendingChoice === "Steal"}
              onSelect={() => !isLocking && setPendingChoice(pendingChoice === "Split" ? null : "Split")}
              dragX={dragX < 0 ? Math.abs(dragX) : 0}
            />
            <ChoiceCard
              choice="Steal"
              selected={pendingChoice === "Steal"}
              dimmed={pendingChoice === "Split"}
              onSelect={() => !isLocking && setPendingChoice(pendingChoice === "Steal" ? null : "Steal")}
              dragX={dragX > 0 ? dragX : 0}
            />
          </div>

          {pendingChoice && !isLocking ? (
            <p className={`${styles.chosenText} ${pendingChoice === "Split" ? styles.chosenSplit : styles.chosenSteal}`}>
              {pendingChoice} selected — tap again to change
            </p>
          ) : !isLocking ? (
            <p className={styles.hintText}>tap a card · or swipe ←→</p>
          ) : null}

          {/* Lock In button */}
          <button
            onClick={lockIn}
            disabled={!pendingChoice || isLocking}
            className={`${styles.ctaButton} ${pendingChoice === "Split" ? styles.btnSplit : pendingChoice === "Steal" ? styles.btnSteal : ""}`}
          >
            {isLocking ? (
              <span className={styles.btnInner}>
                <Spinner size={18} color="white" />
                Locking in…
              </span>
            ) : (
              pendingChoice ? `Lock In ${pendingChoice}` : "Choose a card"
            )}
          </button>
        </>
      )}

      {/* ── Waiting after lock-in ── */}
      {myCommitted && !myRevealed && statusKey !== "Revealing" && (
        <div className={styles.statusBox}>
          <div className={styles.statusIcon}>🔒</div>
          <p className={styles.statusTitle} style={{ color: "#10b981" }}>Choice locked in</p>
          <p className={styles.statusSub}>
            {bothCommitted ? "Both locked in — revealing soon…" : "Waiting for your opponent…"}
          </p>
          {bothCommitted && (
            <div className={styles.spinnerRow}>
              <Spinner size={16} color="#a78bfa" />
            </div>
          )}
        </div>
      )}

      {/* ── Reveal ── */}
      {isPlayer && statusKey === "Revealing" && !myRevealed && (
        <div className={styles.statusBox}>
          <div className={styles.statusIcon}>🎭</div>
          <p className={styles.statusTitle}>Time to reveal</p>
          <p className={styles.statusSub}>Both players have locked in</p>
          <button
            onClick={reveal}
            disabled={isRevealing}
            className={`${styles.ctaButton} ${styles.btnReveal}`}
          >
            {isRevealing ? (
              <span className={styles.btnInner}>
                <Spinner size={18} color="white" />
                Revealing…
              </span>
            ) : (
              "Reveal My Choice"
            )}
          </button>
        </div>
      )}

      {/* ── Revealed, waiting for other ── */}
      {myRevealed && !bothRevealed && (
        <div className={styles.statusBox}>
          <div className={styles.statusIcon}>✓</div>
          <p className={styles.statusTitle} style={{ color: "#a78bfa" }}>Revealed</p>
          <p className={styles.statusSub}>Waiting for opponent to reveal…</p>
          <div className={styles.spinnerRow}><Spinner size={16} color="#a78bfa" /></div>
        </div>
      )}

      {/* ── Both revealed ── */}
      {bothRevealed && statusKey === "Revealing" && (
        <div className={styles.statusBox}>
          <div className={styles.spinnerRow}><Spinner size={20} color="#fcd34d" /></div>
          <p className={styles.statusTitle} style={{ color: "#fcd34d" }}>Resolving…</p>
        </div>
      )}

      {/* ── Join UI ── */}
      {seat === 0 && statusKey === "WaitingForPlayers" && (
        <div className={styles.statusBox}>
          <p className={styles.statusTitle} style={{ marginBottom: "0.75rem" }}>Choose your seat</p>
          {([1, 2] as const).map((s) => {
            const taken = s === 1 ? !!game.player1 : !!game.player2;
            return (
              <button
                key={s}
                onClick={() => !taken && joinAsSeat(s)}
                disabled={taken || isJoining}
                className={styles.actionButton}
                style={taken ? { backgroundColor: "#1f2937", color: "#4b5563" } : undefined}
              >
                {taken ? `Seat ${s} taken` : `Join as Player ${s}`}
              </button>
            );
          })}
        </div>
      )}

      {isPlayer && statusKey === "WaitingForPlayers" && (seat === 1 ? !game.player1 : !game.player2) && (
        <div className={styles.statusBox}>
          <button
            onClick={() => joinAsSeat(seat as 1 | 2)}
            disabled={isJoining}
            className={styles.actionButton}
          >
            {isJoining ? (
              <span className={styles.btnInner}><Spinner size={16} color="white" />Joining…</span>
            ) : "Join Game"}
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {txError && <div className={styles.errorBox}>{txError}</div>}

      {/* ── Result overlay ── */}
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
    <Suspense fallback={<div className={styles.loader}><Spinner size={32} color="#6b7280" /></div>}>
      <GamePageInner />
    </Suspense>
  );
}
