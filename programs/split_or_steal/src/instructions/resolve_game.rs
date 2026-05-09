use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::SplitOrStealError;
use crate::state::{Choice, Game, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct ResolveGame<'info> {
    /// CHECK: receives lamports back if both steal; validated by address check in handler
    #[account(mut)]
    pub admin: UncheckedAccount<'info>,

    /// CHECK: receives lamports if they win; validated against game.player1/player2
    #[account(mut)]
    pub player1: UncheckedAccount<'info>,

    /// CHECK: receives lamports if they win; validated against game.player1/player2
    #[account(mut)]
    pub player2: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [GAME_SEED, &game_id.to_le_bytes()],
        bump = game.bump,
        close = admin,
    )]
    pub game: Account<'info, Game>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveGame>, _game_id: u64) -> Result<()> {
    let game = &ctx.accounts.game;

    require!(game.status == GameStatus::Revealing, SplitOrStealError::NotRevealing);
    require!(game.player1_choice.is_some() && game.player2_choice.is_some(), SplitOrStealError::RevealIncomplete);
    require!(ctx.accounts.admin.key() == game.admin, SplitOrStealError::Unauthorized);
    require!(Some(ctx.accounts.player1.key()) == game.player1, SplitOrStealError::NotAPlayer);
    require!(Some(ctx.accounts.player2.key()) == game.player2, SplitOrStealError::NotAPlayer);

    let pot = game.pot;
    let p1_choice = game.player1_choice.as_ref().unwrap();
    let p2_choice = game.player2_choice.as_ref().unwrap();

    // Transfer pot from game PDA
    let game_info = ctx.accounts.game.to_account_info();

    match (p1_choice, p2_choice) {
        (Choice::Split, Choice::Split) => {
            // Each player gets half
            let half = pot / 2;
            let remainder = pot - half * 2;
            transfer_from_pda(&game_info, &ctx.accounts.player1.to_account_info(), half)?;
            transfer_from_pda(&game_info, &ctx.accounts.player2.to_account_info(), half + remainder)?;
            msg!("Both split: each player gets {} lamports", half);
        }
        (Choice::Steal, Choice::Split) => {
            // Player 1 (stealer) gets all
            transfer_from_pda(&game_info, &ctx.accounts.player1.to_account_info(), pot)?;
            msg!("Player 1 stole: gets all {} lamports", pot);
        }
        (Choice::Split, Choice::Steal) => {
            // Player 2 (stealer) gets all
            transfer_from_pda(&game_info, &ctx.accounts.player2.to_account_info(), pot)?;
            msg!("Player 2 stole: gets all {} lamports", pot);
        }
        (Choice::Steal, Choice::Steal) => {
            // House keeps the money — admin gets it back via `close = admin`
            msg!("Both stole: house keeps all {} lamports", pot);
        }
    }

    Ok(())
}

fn transfer_from_pda(from: &AccountInfo, to: &AccountInfo, lamports: u64) -> Result<()> {
    **from.try_borrow_mut_lamports()? -= lamports;
    **to.try_borrow_mut_lamports()? += lamports;
    Ok(())
}
