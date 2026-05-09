use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::SplitOrStealError;
use crate::state::{Game, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CommitChoice<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

pub fn handler(ctx: Context<CommitChoice>, _game_id: u64, commitment: [u8; 32]) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player_key = ctx.accounts.player.key();

    // Allow committing once both players are in and chat is over
    require!(
        game.status == GameStatus::Active || game.status == GameStatus::Committing,
        SplitOrStealError::GameNotWaiting
    );

    if Some(player_key) == game.player1 {
        require!(game.player1_commitment.is_none(), SplitOrStealError::AlreadyCommitted);
        game.player1_commitment = Some(commitment);
    } else if Some(player_key) == game.player2 {
        require!(game.player2_commitment.is_none(), SplitOrStealError::AlreadyCommitted);
        game.player2_commitment = Some(commitment);
    } else {
        return err!(SplitOrStealError::NotAPlayer);
    }

    // Transition to Committing once first commit lands; to Revealing once both committed
    if game.player1_commitment.is_some() && game.player2_commitment.is_some() {
        game.status = GameStatus::Revealing;
    } else {
        game.status = GameStatus::Committing;
    }

    msg!("Commitment recorded for {}", player_key);
    Ok(())
}
