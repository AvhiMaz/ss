"use client";

import { useState } from "react";
import { useAllGames, GameAccount } from "@/hooks/useGame";

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
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="border border-gray-700 rounded-xl p-6 space-y-4 bg-gray-900/40">
        <h2 className="font-semibold text-lg">Create New Game</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Game ID (auto if blank)</label>
            <input
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 42"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Pot (SOL)</label>
            <input
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-indigo-500"
              value={potSol}
              onChange={(e) => setPotSol(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={createGame}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
        >
          Create Game (deposit {potSol} SOL)
        </button>
      </div>

      {resolvable.length > 0 && (
        <div className="border border-gray-700 rounded-xl p-6 space-y-4 bg-gray-900/40">
          <h2 className="font-semibold text-lg">Games Ready to Resolve</h2>
          {resolvable.map(({ account }) => (
            <div key={account.game_id.toString()} className="flex items-center justify-between border border-gray-700 rounded-lg p-3">
              <span className="font-mono text-sm">Game #{account.game_id.toString()}</span>
              <button
                onClick={() => resolveGame(account)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition"
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {txStatus && (
        <p className="text-sm text-gray-400 border border-gray-700 rounded-lg px-4 py-2">{txStatus}</p>
      )}

      {playerLinks && (
        <div className="border border-indigo-500/30 rounded-xl p-4 bg-indigo-500/5 space-y-3">
          <p className="text-sm font-semibold text-indigo-300">Share these links with players:</p>
          {([1, 2] as const).map((s) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/game/${playerLinks.gameId}?seat=${s}`;
            return (
              <div key={s} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Player {s}</span>
                <code className="flex-1 text-xs bg-gray-800 rounded px-2 py-1 font-mono truncate">{url}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(url)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition"
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
