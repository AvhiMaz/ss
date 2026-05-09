"use client";

import { FC, ReactNode } from "react";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

const endpoint = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <ConnectionProvider endpoint={endpoint}>
    {children}
  </ConnectionProvider>
);
