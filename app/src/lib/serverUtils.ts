import { createHmac } from "crypto";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { IDL } from "@/lib/idl";

export function getAdminKeypair(): Keypair {
  const raw = process.env.ADMIN_PRIVATE_KEY;
  if (!raw) throw new Error("ADMIN_PRIVATE_KEY not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
}

// Deterministic per-seat keypair — no state needed, derived from server secret
export function derivePlayerKeypair(gameId: string, seat: 1 | 2): Keypair {
  const secret = process.env.SERVER_SECRET;
  if (!secret) throw new Error("SERVER_SECRET not set");
  const seed = createHmac("sha256", secret)
    .update(`game-${gameId}-seat-${seat}`)
    .digest(); // 32 bytes
  return Keypair.fromSeed(seed);
}

export function getConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed"
  );
}

export function getProgram(feePayer: Keypair, connection?: Connection): Program<any> {
  const conn = connection ?? getConnection();
  const wallet = {
    publicKey: feePayer.publicKey,
    signTransaction: async (tx: any) => { tx.partialSign(feePayer); return tx; },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((tx) => tx.partialSign(feePayer));
      return txs;
    },
  };
  const provider = new AnchorProvider(conn, wallet as any, { commitment: "confirmed" });
  return new Program(IDL as any, provider);
}
