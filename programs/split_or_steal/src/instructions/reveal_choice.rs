use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

use crate::constants::*;
use crate::error::SplitOrStealError;
use crate::state::{Choice, Game, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct RevealChoice<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

pub fn handler(ctx: Context<RevealChoice>, _game_id: u64, choice: Choice, nonce: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player_key = ctx.accounts.player.key();

    require!(game.status == GameStatus::Revealing, SplitOrStealError::NotRevealing);

    // Commitment is SHA256(choice_byte || nonce_le_bytes)
    let choice_byte: u8 = match choice {
        Choice::Split => 0,
        Choice::Steal => 1,
    };
    let mut hasher = Sha256::new();
    hasher.update([choice_byte]);
    hasher.update(nonce.to_le_bytes());
    let computed_hash: [u8; 32] = hasher.finalize().into();

    if Some(player_key) == game.player1 {
        require!(game.player1_choice.is_none(), SplitOrStealError::AlreadyRevealed);
        let commitment = game.player1_commitment.ok_or(SplitOrStealError::NoCommitment)?;
        require!(computed_hash == commitment, SplitOrStealError::CommitmentMismatch);
        game.player1_choice = Some(choice);
    } else if Some(player_key) == game.player2 {
        require!(game.player2_choice.is_none(), SplitOrStealError::AlreadyRevealed);
        let commitment = game.player2_commitment.ok_or(SplitOrStealError::NoCommitment)?;
        require!(computed_hash == commitment, SplitOrStealError::CommitmentMismatch);
        game.player2_choice = Some(choice);
    } else {
        return err!(SplitOrStealError::NotAPlayer);
    }

    msg!("Choice revealed for {}", player_key);
    Ok(())
}
