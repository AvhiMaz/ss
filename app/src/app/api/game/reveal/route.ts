import { NextRequest, NextResponse } from "next/server";
import { BN, BorshInstructionCoder } from "@coral-xyz/anchor";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAdminKeypair, getConnection, derivePlayerKeypair } from "@/lib/serverUtils";
import { deriveGamePDA, PROGRAM_ID } from "@/lib/constants";
import { IDL } from "@/lib/idl";

export async function POST(req: NextRequest) {
  try {
    const { gameId, seat, choice, nonce } = await req.json();
    // choice: "Split" | "Steal", nonce: string (bigint)

    if (choice !== "Split" && choice !== "Steal") {
      return NextResponse.json({ error: `Invalid choice: ${choice}` }, { status: 400 });
    }

    const admin = getAdminKeypair();
    const player = derivePlayerKeypair(gameId, seat);
    const gamePda = deriveGamePDA(BigInt(gameId));
    const connection = getConnection();

    // Build the instruction data directly — bypass Anchor's account resolver
    const coder = new BorshInstructionCoder(IDL as any);
    const data = coder.encode("reveal_choice", {
      game_id: new BN(gameId),
      choice: { [choice]: {} },
      nonce: new BN(nonce),
    });

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: player.publicKey, isSigner: true, isWritable: true },
        { pubkey: gamePda, isSigner: false, isWritable: true },
      ],
      data: Buffer.from(data),
    });

    const tx = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = admin.publicKey;
    tx.sign(admin, player);

    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    return NextResponse.json({ success: true, tx: sig });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
