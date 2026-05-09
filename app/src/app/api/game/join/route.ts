import { NextRequest, NextResponse } from "next/server";
import { BN } from "@coral-xyz/anchor";
import { getAdminKeypair, getProgram, derivePlayerKeypair } from "@/lib/serverUtils";
import { deriveGamePDA } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { gameId, seat } = await req.json(); // seat: 1 | 2
    const admin = getAdminKeypair();
    const player = derivePlayerKeypair(gameId, seat);
    const program = getProgram(admin);

    const gamePda = deriveGamePDA(BigInt(gameId));
    const tx = await (program as any).methods
      .joinGame(new BN(gameId))
      .accounts({ player: player.publicKey, game: gamePda })
      .signers([player])
      .rpc();

    return NextResponse.json({ success: true, tx });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
