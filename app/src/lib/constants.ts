import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("DiuZ2ZjMdhqr7zA6zZuQoxR8bUoJf9kck1RG3KtwB9ex");
export const GAME_SEED = Buffer.from("game");
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const CHAT_DURATION_MS = 60_000;

export function gameIdToBytes(gameId: bigint): Buffer {
  const arr = new Uint8Array(8);
  new DataView(arr.buffer).setBigUint64(0, gameId, true);
  return Buffer.from(arr);
}

export function deriveGamePDA(gameId: bigint): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [GAME_SEED, gameIdToBytes(gameId)],
    PROGRAM_ID
  );
  return pda;
}

// SHA256(choice_byte || nonce_le_bytes) — must match the Rust program
export async function buildCommitment(
  choice: "Split" | "Steal",
  nonce: bigint
): Promise<Uint8Array> {
  const choiceByte = choice === "Split" ? 0 : 1;
  const preimage = new Uint8Array(9);
  preimage[0] = choiceByte;
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  view.setBigUint64(0, nonce, true); // little-endian
  preimage.set(nonceBytes, 1);

  const hashBuffer = await crypto.subtle.digest("SHA-256", preimage);
  return new Uint8Array(hashBuffer);
}
