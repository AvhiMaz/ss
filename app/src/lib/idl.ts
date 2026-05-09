export const IDL = {
  address: "DiuZ2ZjMdhqr7zA6zZuQoxR8bUoJf9kck1RG3KtwB9ex",
  metadata: {
    name: "split_or_steal",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Split or Steal — a 2-player Solana game",
  },
  instructions: [
    {
      name: "commit_choice",
      discriminator: [73, 157, 49, 7, 250, 212, 125, 182],
      accounts: [
        { name: "player", writable: true, signer: true },
        {
          name: "game",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [103, 97, 109, 101] },
              { kind: "arg", path: "game_id" },
            ],
          },
        },
      ],
      args: [
        { name: "game_id", type: "u64" },
        { name: "commitment", type: { array: ["u8", 32] } },
      ],
    },
    {
      name: "create_game",
      discriminator: [124, 69, 75, 66, 184, 220, 72, 206],
      accounts: [
        { name: "admin", writable: true, signer: true },
        {
          name: "game",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [103, 97, 109, 101] },
              { kind: "arg", path: "game_id" },
            ],
          },
        },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "game_id", type: "u64" },
        { name: "pot_lamports", type: "u64" },
      ],
    },
    {
      name: "join_game",
      discriminator: [107, 112, 18, 38, 56, 173, 60, 128],
      accounts: [
        { name: "player", writable: true, signer: true },
        {
          name: "game",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [103, 97, 109, 101] },
              { kind: "arg", path: "game_id" },
            ],
          },
        },
      ],
      args: [{ name: "game_id", type: "u64" }],
    },
    {
      name: "resolve_game",
      discriminator: [25, 119, 183, 229, 196, 69, 169, 79],
      accounts: [
        { name: "admin", writable: true },
        { name: "player1", writable: true },
        { name: "player2", writable: true },
        {
          name: "game",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [103, 97, 109, 101] },
              { kind: "arg", path: "game_id" },
            ],
          },
        },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [{ name: "game_id", type: "u64" }],
    },
    {
      name: "reveal_choice",
      discriminator: [235, 189, 39, 0, 144, 153, 52, 9],
      accounts: [
        { name: "player", writable: true, signer: true },
        {
          name: "game",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [103, 97, 109, 101] },
              { kind: "arg", path: "game_id" },
            ],
          },
        },
      ],
      args: [
        { name: "game_id", type: "u64" },
        { name: "choice", type: { defined: { name: "Choice" } } },
        { name: "nonce", type: "u64" },
      ],
    },
  ],
  accounts: [
    {
      name: "Game",
      discriminator: [27, 90, 166, 125, 74, 100, 121, 18],
    },
  ],
  errors: [
    { code: 6000, name: "GameNotWaiting", msg: "Game is not waiting for players" },
    { code: 6001, name: "GameFull", msg: "Game is already full" },
    { code: 6002, name: "NotAPlayer", msg: "Player is not in this game" },
    { code: 6003, name: "ChatNotOver", msg: "Chat timer has not expired yet" },
    { code: 6004, name: "AlreadyCommitted", msg: "Player has already committed a choice" },
    { code: 6005, name: "NotCommitting", msg: "Game is not in committing phase" },
    { code: 6006, name: "NotRevealing", msg: "Game is not in revealing phase" },
    { code: 6007, name: "NoCommitment", msg: "Player has not committed a choice" },
    { code: 6008, name: "CommitmentMismatch", msg: "Choice does not match commitment hash" },
    { code: 6009, name: "AlreadyRevealed", msg: "Player has already revealed" },
    { code: 6010, name: "RevealIncomplete", msg: "Not both players have revealed" },
    { code: 6011, name: "Unauthorized", msg: "Unauthorized: only admin can perform this action" },
    { code: 6012, name: "GameOver", msg: "Game is already resolved or cancelled" },
    { code: 6013, name: "InsufficientPot", msg: "Pot amount must be at least 1 SOL" },
  ],
  types: [
    {
      name: "Choice",
      type: { kind: "enum", variants: [{ name: "Split" }, { name: "Steal" }] },
    },
    {
      name: "Game",
      type: {
        kind: "struct",
        fields: [
          { name: "game_id", type: "u64" },
          { name: "admin", type: "pubkey" },
          { name: "player1", type: { option: "pubkey" } },
          { name: "player2", type: { option: "pubkey" } },
          { name: "player1_commitment", type: { option: { array: ["u8", 32] } } },
          { name: "player2_commitment", type: { option: { array: ["u8", 32] } } },
          { name: "player1_choice", type: { option: { defined: { name: "Choice" } } } },
          { name: "player2_choice", type: { option: { defined: { name: "Choice" } } } },
          { name: "status", type: { defined: { name: "GameStatus" } } },
          { name: "pot", type: "u64" },
          { name: "chat_ends_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "GameStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "WaitingForPlayers" },
          { name: "Active" },
          { name: "Committing" },
          { name: "Revealing" },
          { name: "Resolved" },
          { name: "Cancelled" },
        ],
      },
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SplitOrSteal = any;
