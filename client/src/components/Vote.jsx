import React from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { useState } from 'react';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const Vote = ({ walletAddress, idlWithAddress, getProvider }) => {
    const [proposalId, setProposalId] = useState('');
    const [stakeAmount, setStakeAmount] = useState('');

    // Convert tokens to raw amount (6 decimals)
    const tokensToRaw = (tokens) => {
        return Math.floor(Number(tokens) * 1_000_000);
    };

    const vote = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet");
            return;
        }
        const provider = getProvider();
        const program = new anchor.Program(idlWithAddress, provider);

        let [proposalCounterPda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode(SEEDS.PROPOSAL_COUNTER)],
            program.programId
        );

        let [proposalAccountPda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode(SEEDS.PROPOSAL), Buffer.from([Number(proposalId)])],
            program.programId
        );

        let [xMintPda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode(SEEDS.X_MINT)],
            program.programId
        );

        let [treasuryConfigPda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode(SEEDS.TREASURY_CONFIG)],
            program.programId
        );

        // Fetch treasury config to get the treasury token account
        const treasuryConfig = await program.account.treasuryConfig.fetch(treasuryConfigPda);

        const voterTokenAccount = await getAssociatedTokenAddress(
            xMintPda,
            provider.wallet.publicKey
        );

        const stakeRaw = tokensToRaw(stakeAmount);

        const tx = await program.methods.proposalToVote(
            Number(proposalId),
            new anchor.BN(stakeRaw)
        ).accountsPartial({
            proposalCounter: proposalCounterPda,
            proposalAccount: proposalAccountPda,
            signer: provider.wallet.publicKey,
            xMint: xMintPda,
            voterTokenAccount: voterTokenAccount,
            treasuryTokenAccount: treasuryConfig.treasuryTokenAccount,
        }).rpc();
        console.log("Transaction successful", tx);
    }
    return (
        <div className="card">
            <h2>🗳️ Cast Vote</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                vote();
            }}>
                <input type="number" placeholder="Proposal ID" value={proposalId} onChange={(e) => setProposalId(e.target.value)} />
                <input type="number" step="0.01" placeholder="Token Amount to Stake" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
                <button type="submit">Vote</button>
            </form>
        </div>
    )
}

export default Vote;
