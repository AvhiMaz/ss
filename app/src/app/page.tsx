"use client";

import { useAllGames } from "@/hooks/useGame";
import { GameCard } from "@/components/GameCard";
import styles from "./lobby.module.css";
import Link from "next/link";

export default function LobbyPage() {
  const { games, loading } = useAllGames();

  const active = games.filter((g) => {
    const s = Object.keys(g.account.status)[0];
    return s !== "Resolved" && s !== "Cancelled";
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Game Lobby</h1>
        <p className={styles.subtitle}>Join a game and prove your trust — or test your nerve.</p>
      </div>

      <div className={styles.howItWorks}>
        <h2 className={styles.howItWorksTitle}>How it works</h2>
        <div className={styles.howItWorksGrid}>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksEmoji}>🤝</div>
            <p className={styles.howItWorksLabel}>Both Split</p>
            <p className={styles.howItWorksDesc}>Each player gets half the pot</p>
          </div>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksEmoji}>🐍</div>
            <p className={styles.howItWorksLabel}>One Steals</p>
            <p className={styles.howItWorksDesc}>Stealer takes everything, other gets nothing</p>
          </div>
          <div className={styles.howItWorksItem}>
            <div className={styles.howItWorksEmoji}>🏦</div>
            <p className={styles.howItWorksLabel}>Both Steal</p>
            <p className={styles.howItWorksDesc}>No one wins — house keeps the pot</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className={styles.sectionTitle}>Active Games</h2>
        {loading ? (
          <p style={{ color: '#71717a' }}>Loading games…</p>
        ) : active.length === 0 ? (
          <div className={styles.emptyState}>
            <p style={{ margin: '0 0 0.5rem' }}>No active games right now.</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Ask the admin to create one, or head to <Link href="/admin" className={styles.adminLink}>Admin</Link>.
            </p>
          </div>
        ) : (
          <div className={styles.gamesGrid}>
            {active.map((g) => (
              <GameCard key={g.pubkey.toBase58()} pubkey={g.pubkey} account={g.account} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
