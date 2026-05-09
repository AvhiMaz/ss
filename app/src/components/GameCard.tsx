"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { GameAccount } from "@/hooks/useGame";
import styles from "@/app/lobby.module.css";

const STATUS_LABELS: Record<string, string> = {
  WaitingForPlayers: "Waiting for players",
  Active: "In progress",
  Committing: "Committing choices",
  Revealing: "Revealing choices",
  Resolved: "Resolved",
  Cancelled: "Cancelled",
};

export function GameCard({ pubkey, account }: { pubkey: PublicKey; account: GameAccount }) {
  const solPot = Number(account.pot) / 1e9;
  const statusKey = Object.keys(account.status)[0];
  const players = [account.player1, account.player2].filter(Boolean).length;

  return (
    <Link href={`/game/${account.game_id}`} className={styles.gameCard}>
      <div className={styles.gameCardInner}>
        <div className={styles.gameCardHeader}>
          <span className={styles.gameCardTitle}>Game #{account.game_id.toString()}</span>
          <span className={`${styles.statusBadge} ${styles[statusKey] || ""}`}>
            {STATUS_LABELS[statusKey] ?? statusKey}
          </span>
        </div>
        <div className={styles.gameCardDetails}>
          <span>💰 {solPot.toFixed(2)} SOL</span>
          <span>👥 {players}/2 players</span>
        </div>
        <p className={styles.gameCardPubkey}>{pubkey.toBase58()}</p>
      </div>
    </Link>
  );
}
