use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::error::SplitOrStealError;
use crate::state::{Game, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CreateGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Game::LEN,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump,
    )]
    pub game: Account<'info, Game>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGame>, game_id: u64, pot_lamports: u64) -> Result<()> {
    require!(pot_lamports >= LAMPORTS_PER_GAME, SplitOrStealError::InsufficientPot);

    let game = &mut ctx.accounts.game;
    game.game_id = game_id;
    game.admin = ctx.accounts.admin.key();
    game.player1 = None;
    game.player2 = None;
    game.player1_commitment = None;
    game.player2_commitment = None;
    game.player1_choice = None;
    game.player2_choice = None;
    game.status = GameStatus::WaitingForPlayers;
    game.pot = pot_lamports;
    game.chat_ends_at = 0;
    game.bump = ctx.bumps.game;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.admin.to_account_info(),
                to: ctx.accounts.game.to_account_info(),
            },
        ),
        pot_lamports,
    )?;

    msg!("Game {} created with pot {} lamports", game_id, pot_lamports);
    Ok(())
}
