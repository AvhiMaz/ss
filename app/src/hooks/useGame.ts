"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import { IDL } from "@/lib/idl";
import { deriveGamePDA } from "@/lib/constants";

export type GameStatus =
  | "WaitingForPlayers"
  | "Active"
  | "Committing"
  | "Revealing"
  | "Resolved"
  | "Cancelled";

export type Choice = "Split" | "Steal";

export interface GameAccount {
  game_id: any;
  admin: PublicKey;
  player1: PublicKey | null;
  player2: PublicKey | null;
  player1_commitment: number[] | null;
  player2_commitment: number[] | null;
  player1_choice: any | null;
  player2_choice: any | null;
  status: any;
  pot: any;
  chat_ends_at: any;
  bump: number;
}

const coder = new BorshCoder(IDL as never);

export function useGame(gameId: bigint | null) {
  const { connection } = useConnection();
  const [game, setGame] = useState<GameAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastGame = useRef<GameAccount | null>(null);

  const fetchGame = useCallback(async () => {
    if (gameId === null) return;
    setLoading(true);
    setError(null);
    try {
      const pda = deriveGamePDA(gameId);
      const accountInfo = await connection.getAccountInfo(pda);
      if (!accountInfo) {
        // Account closed (resolve uses `close = admin`) — keep last state as Resolved
        if (lastGame.current) {
          setGame({ ...lastGame.current, status: { Resolved: {} } as any });
        } else {
          setGame(null);
        }
        return;
      }
      const decoded = coder.accounts.decode("Game", accountInfo.data);
      lastGame.current = decoded as GameAccount;
      setGame(decoded as GameAccount);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [connection, gameId]);

  useEffect(() => {
    fetchGame();
    if (gameId === null) return;
    const pda = deriveGamePDA(gameId);
    const subId = connection.onAccountChange(pda, () => fetchGame(), "confirmed");
    return () => { connection.removeAccountChangeListener(subId); };
  }, [connection, gameId, fetchGame]);

  return { game, loading, error, refetch: fetchGame };
}

export function useAllGames() {
  const { connection } = useConnection();
  const [games, setGames] = useState<{ pubkey: PublicKey; account: GameAccount }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const programId = new PublicKey("6sTBcie75owJJor9QixdGKuiW6cDXd6KV92Rt7sHm7G5");
      // Filter by account discriminator for Game accounts
      const discriminator = Buffer.from([27, 90, 166, 125, 74, 100, 121, 18]);
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 0, bytes: discriminator.toString("base64"), encoding: "base64" } }],
        encoding: "base64",
      });
      const parsed = accounts
        .map(({ pubkey, account }) => {
          try {
            const decoded = coder.accounts.decode("Game", account.data);
            return { pubkey, account: decoded as GameAccount };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as { pubkey: PublicKey; account: GameAccount }[];
      setGames(parsed);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { games, loading, refetch: fetchAll };
}
