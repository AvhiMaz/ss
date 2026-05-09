"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useGame } from "@/hooks/useGame";
import { buildCommitment } from "@/lib/constants";

function GamePageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const seat = Number(searchParams.get("seat")) as 1 | 2 | 0;
  const gameId = id ?? "0";

  const { game, loading, error } = useGame(BigInt(gameId));

  const [sliderValue, setSliderValue] = useState(1); // 0=Split, 1=neutral, 2=Steal
  const pendingChoice = sliderValue === 0 ? "Split" : sliderValue === 2 ? "Steal" : null;
  const [nonce] = useState(() => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [autoResolved, setAutoResolved] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const autoCommitFired = useRef(false);

  // Keep `now` in sync so the countdown re-renders each second
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-resolve via backend — fires for anyone watching the page
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

  if (loading) return <p className="text-gray-400">Loading game…</p>;
  if (error || !game) return <p className="text-red-400">Game not found.</p>;

  const statusKey = Object.keys(game.status)[0] as string;
  const chatEndsAt = Number(game.chat_ends_at);
  const BUFFER = 2; // seconds buffer for validator clock skew
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
    setTxStatus("Committing choice…");
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
    const pot = (Number(game.pot) / 1e9).toFixed(2);
    const half = (Number(game.pot) / 2 / 1e9).toFixed(2);
    const myWin = seat === 1
      ? (p1 === "Steal" && p2 === "Split" ? pot : p1 === "Split" && p2 === "Split" ? half : "0")
      : seat === 2
      ? (p2 === "Steal" && p1 === "Split" ? pot : p1 === "Split" && p2 === "Split" ? half : "0")
      : null;
    if (p1 === "Split" && p2 === "Split") return {
      emoji: "🤝",
      title: "Both Split!",
      text: `Each player takes ${half} SOL`,
      you: myWin ? `+${myWin} SOL` : null,
      color: "border-emerald-500/30 bg-emerald-500/10",
    };
    if (p1 === "Steal" && p2 === "Steal") return {
      emoji: "🏦",
      title: "Both Stole.",
      text: "No one wins — house keeps the pot",
      you: myWin ? `+${myWin} SOL` : null,
      color: "border-red-500/30 bg-red-500/10",
    };
    if (p1 === "Steal") return {
      emoji: "🐍",
      title: "Player 1 Stole!",
      text: `Player 1 takes all ${pot} SOL`,
      you: myWin ? `+${myWin} SOL` : null,
      color: "border-yellow-500/30 bg-yellow-500/10",
    };
    if (p2 === "Steal") return {
      emoji: "🐍",
      title: "Player 2 Stole!",
      text: `Player 2 takes all ${pot} SOL`,
      you: myWin ? `+${myWin} SOL` : null,
      color: "border-yellow-500/30 bg-yellow-500/10",
    };
    return null;
  })();

  const thumbColor = pendingChoice === "Split" ? "#10b981" : pendingChoice === "Steal" ? "#ef4444" : "#6b7280";
  const trackColor = pendingChoice === "Split" ? "bg-emerald-900" : pendingChoice === "Steal" ? "bg-red-900" : "bg-gray-700";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game #{gameId}</h1>
        <p className="text-gray-400 text-sm">Pot: {solPot} SOL{seat ? ` · You are Player ${seat}` : " · Spectating"}</p>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4">
        {([1, 2] as const).map((s) => {
          const key = s === 1 ? game.player1 : game.player2;
          const isYou = seat === s;
          return (
            <div key={s} className={`rounded-xl border p-4 ${isYou ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 bg-gray-800/40"}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Player {s}</p>
              <p className="font-mono text-sm mt-1">{shortKey(key)}</p>
              {isYou && <span className="text-xs text-indigo-400 font-semibold">You</span>}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Seat picker — shown when arriving without a seat param */}
        {seat === 0 && statusKey === "WaitingForPlayers" && (
          <div className="grid grid-cols-2 gap-3">
            {([1, 2] as const).map((s) => {
              const taken = s === 1 ? !!game.player1 : !!game.player2;
              return (
                <button
                  key={s}
                  onClick={() => !taken && joinAsSeat(s)}
                  disabled={taken}
                  className={`py-3 rounded-xl font-semibold transition ${
                    taken
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {taken ? `Seat ${s} taken` : `Join as Player ${s}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Already has a seat — show join button if not yet joined */}
        {canJoin && (
          <button onClick={() => joinAsSeat(seat as 1 | 2)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition">
            Join Game
          </button>
        )}

        {/* Slider — visible during countdown AND after, until committed */}
        {isPlayer && (statusKey === "Active" || statusKey === "Committing") && !myCommitted && (
          <div className="space-y-4 p-4 border border-gray-700 rounded-xl bg-gray-900">
            {/* Countdown inside the card */}
            {!chatOver && chatEndsAt > 0 && (
              <div className="text-center pb-2">
                <p className="text-4xl font-mono font-bold tabular-nums">{secondsLeft}s</p>
                <p className="text-xs text-gray-500 mt-1">Choose before time runs out</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold px-1">
                <span className={`transition-colors ${pendingChoice === "Split" ? "text-emerald-400" : "text-gray-500"}`}>🤝 Split</span>
                <span className={`transition-colors ${pendingChoice === "Steal" ? "text-red-400" : "text-gray-500"}`}>🐍 Steal</span>
              </div>
              <div className="relative flex items-center h-12">
                <div className={`absolute inset-x-0 h-3 rounded-full transition-colors duration-300 ${trackColor}`} />
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="choice-slider relative w-full appearance-none bg-transparent cursor-pointer"
                  style={{ ["--thumb-color" as string]: thumbColor }}
                />
              </div>
              {pendingChoice ? (
                <p className={`text-center text-sm font-bold ${pendingChoice === "Split" ? "text-emerald-400" : "text-red-400"}`}>
                  {pendingChoice === "Split" ? "🤝 You chose Split" : "🐍 You chose Steal"}
                </p>
              ) : (
                <p className="text-center text-sm text-gray-500">Slide left to Split · right to Steal</p>
              )}
            </div>

            {chatOver ? (
              <button
                onClick={commitChoice}
                disabled={!pendingChoice}
                className={`w-full py-3 rounded-xl font-semibold transition disabled:opacity-40 ${
                  pendingChoice === "Split" ? "bg-emerald-600 hover:bg-emerald-500" :
                  pendingChoice === "Steal" ? "bg-red-600 hover:bg-red-500" : "bg-gray-700"
                }`}
              >
                {pendingChoice ? `Lock in ${pendingChoice}` : "Move slider to choose"}
              </button>
            ) : (
              <button disabled className="w-full py-3 rounded-xl font-semibold bg-gray-700 opacity-40 cursor-not-allowed">
                Locks in at 0s
              </button>
            )}
          </div>
        )}

        {myCommitted && !myRevealed && statusKey !== "Revealing" && (
          <p className="text-emerald-400 text-sm text-center">✓ Choice committed — waiting for opponent…</p>
        )}

        {/* Reveal */}
        {isPlayer && statusKey === "Revealing" && !myRevealed && (
          <button onClick={revealChoice} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition">
            Reveal My Choice
          </button>
        )}

        {myRevealed && !bothRevealed && (
          <p className="text-purple-400 text-sm text-center">✓ Revealed — waiting for opponent…</p>
        )}

        {bothRevealed && statusKey === "Revealing" && (
          <p className="text-yellow-400 text-sm text-center animate-pulse">Resolving game…</p>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`text-center p-8 rounded-2xl border space-y-2 ${result.color}`}>
          <div className="text-5xl">{result.emoji}</div>
          <p className="text-2xl font-bold">{result.title}</p>
          <p className="text-gray-300">{result.text}</p>
          {result.you && (
            <p className={`text-lg font-bold mt-2 ${result.you === "+0 SOL" ? "text-red-400" : "text-emerald-400"}`}>
              You: {result.you}
            </p>
          )}
        </div>
      )}

      {txStatus && (
        <p className="text-sm text-gray-400 border border-gray-700 rounded-lg px-4 py-2">{txStatus}</p>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
      <GamePageInner />
    </Suspense>
  );
}
