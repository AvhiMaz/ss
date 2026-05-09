use anchor_lang::prelude::*;

#[account]
pub struct Game {
    pub game_id: u64,
    pub admin: Pubkey,
    pub player1: Option<Pubkey>,
    pub player2: Option<Pubkey>,
    pub player1_commitment: Option<[u8; 32]>,
    pub player2_commitment: Option<[u8; 32]>,
    pub player1_choice: Option<Choice>,
    pub player2_choice: Option<Choice>,
    pub status: GameStatus,
    pub pot: u64,
    pub chat_ends_at: i64,
    pub bump: u8,
}

impl Game {
    // 8 discriminator + 8 game_id + 32 admin
    // + 33*2 player options + 33*2 commitment options
    // + 2*2 choice options + 1 status + 8 pot + 8 chat_ends_at + 1 bump
    pub const LEN: usize = 8 + 8 + 32 + 33 + 33 + 33 + 33 + 2 + 2 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum Choice {
    Split,
    Steal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    WaitingForPlayers,
    Active,
    Committing,
    Revealing,
    Resolved,
    Cancelled,
}
