"use client";

import { useState } from "react";
import { useAllGames, GameAccount } from "@/hooks/useGame";
import styles from "./admin.module.css";

export default function AdminPage() {
  const { games, refetch } = useAllGames();
  const [gameId, setGameId] = useState("");
  const [potSol, setPotSol] = useState("1");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [playerLinks, setPlayerLinks] = useState<{ gameId: string } | null>(null);

  const createGame = async () => {
    setTxStatus("Creating game…");
    setPlayerLinks(null);
    try {
      const res = await fetch("/api/admin/create-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameId || undefined, potSol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxStatus(`✓ Game ${data.gameId} created!`);
      setPlayerLinks({ gameId: data.gameId });
      setGameId("");
      refetch();
    } catch (e: any) {
      setTxStatus("Error: " + (e.message ?? String(e)));
    }
  };

  const resolveGame = async (account: GameAccount) => {
    setTxStatus("Resolving…");
    try {
      const res = await fetch("/api/admin/resolve-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: account.game_id.toString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTxStatus("✓ Resolved!");
      refetch();
    } catch (e: any) {
      setTxStatus("Error: " + (e.message ?? String(e)));
    }
  };

  const resolvable = games.filter((g) => Object.keys(g.account.status)[0] === "Revealing");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Panel</h1>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Create New Game</h2>
        <div className={styles.inputGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Game ID (auto if blank)</label>
            <input
              className={styles.input}
              placeholder="e.g. 42"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Pot (SOL)</label>
            <input
              className={styles.input}
              value={potSol}
              onChange={(e) => setPotSol(e.target.value)}
            />
          </div>
        </div>
        <button onClick={createGame} className={styles.button}>
          Create Game (deposit {potSol} SOL)
        </button>
      </div>

      {resolvable.length > 0 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Games Ready to Resolve</h2>
          {resolvable.map(({ account }) => (
            <div key={account.game_id.toString()} className={styles.resolveItem}>
              <span className={styles.resolveText}>Game #{account.game_id.toString()}</span>
              <button
                onClick={() => resolveGame(account)}
                className={styles.resolveButton}
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {txStatus && (
        <p className={styles.statusMessage}>{txStatus}</p>
      )}

      {playerLinks && (
        <div className={styles.linksPanel}>
          <p className={styles.linksTitle}>Share these links with players:</p>
          {([1, 2] as const).map((s) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/game/${playerLinks.gameId}?seat=${s}`;
            return (
              <div key={s} className={styles.linkItem}>
                <span className={styles.linkPlayer}>Player {s}</span>
                <code className={styles.linkCode}>{url}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(url)}
                  className={styles.copyButton}
                >
                  Copy
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
