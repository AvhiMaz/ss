import { NextRequest, NextResponse } from "next/server";
import { SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAdminKeypair, getProgram } from "@/lib/serverUtils";
import { deriveGamePDA, LAMPORTS_PER_SOL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { gameId, potSol = "1" } = await req.json();
    const admin = getAdminKeypair();
    const program = getProgram(admin);

    const id = BigInt(gameId || Date.now().toString().slice(-6));
    const lamports = BigInt(Math.round(parseFloat(potSol) * LAMPORTS_PER_SOL));
    const gamePda = deriveGamePDA(id);

    const tx = await (program as any).methods
      .createGame(new BN(id.toString()), new BN(lamports.toString()))
      .accounts({ admin: admin.publicKey, game: gamePda, systemProgram: SystemProgram.programId })
      .rpc();

    return NextResponse.json({ success: true, gameId: id.toString(), tx });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
