use anchor_lang::prelude::*;

#[error_code]
pub enum SplitOrStealError {
    #[msg("Game is not waiting for players")]
    GameNotWaiting,
    #[msg("Game is already full")]
    GameFull,
    #[msg("Player is not in this game")]
    NotAPlayer,
    #[msg("Chat timer has not expired yet")]
    ChatNotOver,
    #[msg("Player has already committed a choice")]
    AlreadyCommitted,
    #[msg("Game is not in committing phase")]
    NotCommitting,
    #[msg("Game is not in revealing phase")]
    NotRevealing,
    #[msg("Player has not committed a choice")]
    NoCommitment,
    #[msg("Choice does not match commitment hash")]
    CommitmentMismatch,
    #[msg("Player has already revealed")]
    AlreadyRevealed,
    #[msg("Not both players have revealed")]
    RevealIncomplete,
    #[msg("Unauthorized: only admin can perform this action")]
    Unauthorized,
    #[msg("Game is already resolved or cancelled")]
    GameOver,
    #[msg("Pot amount must be at least 1 SOL")]
    InsufficientPot,
}
