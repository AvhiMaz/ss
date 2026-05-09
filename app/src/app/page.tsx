"use client";

import { useAllGames } from "@/hooks/useGame";
import { GameCard } from "@/components/GameCard";

export default function LobbyPage() {
  const { games, loading } = useAllGames();

  const active = games.filter((g) => {
    const s = Object.keys(g.account.status)[0];
    return s !== "Resolved" && s !== "Cancelled";
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Game Lobby</h1>
        <p className="text-gray-400 mt-1">Join a game and prove your trust — or test your nerve.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 rounded-2xl border border-gray-800 bg-gray-900/40">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">How it works</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl">🤝</div>
            <p className="font-semibold">Both Split</p>
            <p className="text-sm text-gray-400">Each player gets half the pot</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">🐍</div>
            <p className="font-semibold">One Steals</p>
            <p className="text-sm text-gray-400">Stealer takes everything, other gets nothing</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">🏦</div>
            <p className="font-semibold">Both Steal</p>
            <p className="text-sm text-gray-400">No one wins — house keeps the pot</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Active Games</h2>
        {loading ? (
          <p className="text-gray-500">Loading games…</p>
        ) : active.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No active games right now.</p>
            <p className="text-sm mt-1">Ask the admin to create one, or head to <a href="/admin" className="text-indigo-400 underline">Admin</a>.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {active.map((g) => (
              <GameCard key={g.pubkey.toBase58()} pubkey={g.pubkey} account={g.account} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
