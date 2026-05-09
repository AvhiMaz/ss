use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::SplitOrStealError;
use crate::state::{Game, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
}

pub fn handler(ctx: Context<JoinGame>, _game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player_key = ctx.accounts.player.key();

    require!(game.status == GameStatus::WaitingForPlayers, SplitOrStealError::GameNotWaiting);

    if game.player1.is_none() {
        game.player1 = Some(player_key);
        msg!("Player 1 joined: {}", player_key);
    } else if game.player2.is_none() {
        require!(game.player1 != Some(player_key), SplitOrStealError::GameFull);
        game.player2 = Some(player_key);
        game.chat_ends_at = 0;
        game.status = GameStatus::Active;
        msg!("Player 2 joined: {}", player_key);
    } else {
        return err!(SplitOrStealError::GameFull);
    }

    Ok(())
}
