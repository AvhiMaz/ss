"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { GameAccount } from "@/hooks/useGame";

const STATUS_LABELS: Record<string, string> = {
  WaitingForPlayers: "Waiting for players",
  Active: "In progress",
  Committing: "Committing choices",
  Revealing: "Revealing choices",
  Resolved: "Resolved",
  Cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  WaitingForPlayers: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Committing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Revealing: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Resolved: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

export function GameCard({ pubkey, account }: { pubkey: PublicKey; account: GameAccount }) {
  const solPot = Number(account.pot) / 1e9;
  const statusKey = Object.keys(account.status)[0];
  const players = [account.player1, account.player2].filter(Boolean).length;

  return (
    <Link href={`/game/${account.game_id}`} className="block">
      <div className="border border-gray-700 bg-gray-800/60 rounded-xl p-4 hover:border-indigo-500 transition cursor-pointer space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-bold text-white">Game #{account.game_id.toString()}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[statusKey] ?? ""}`}>
            {STATUS_LABELS[statusKey] ?? statusKey}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>💰 {solPot.toFixed(2)} SOL</span>
          <span>👥 {players}/2 players</span>
        </div>
        <p className="text-xs font-mono text-gray-600 truncate">{pubkey.toBase58()}</p>
      </div>
    </Link>
  );
}
