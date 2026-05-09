pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("DiuZ2ZjMdhqr7zA6zZuQoxR8bUoJf9kck1RG3KtwB9ex");

#[program]
pub mod split_or_steal {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, game_id: u64, pot_lamports: u64) -> Result<()> {
        create_game::handler(ctx, game_id, pot_lamports)
    }

    pub fn join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
        join_game::handler(ctx, game_id)
    }

    pub fn commit_choice(
        ctx: Context<CommitChoice>,
        game_id: u64,
        commitment: [u8; 32],
    ) -> Result<()> {
        commit_choice::handler(ctx, game_id, commitment)
    }

    pub fn reveal_choice(
        ctx: Context<RevealChoice>,
        game_id: u64,
        choice: Choice,
        nonce: u64,
    ) -> Result<()> {
        reveal_choice::handler(ctx, game_id, choice, nonce)
    }

    pub fn resolve_game(ctx: Context<ResolveGame>, game_id: u64) -> Result<()> {
        resolve_game::handler(ctx, game_id)
    }
}
