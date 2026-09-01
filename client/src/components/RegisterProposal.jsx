import React from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { useState } from 'react';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const RegisterProposal = ({ walletAddress, idlWithAddress, getProvider }) => {
    const [proposalDescription, setProposalDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const [stakeAmount, setStakeAmount] = useState('');

    // Convert tokens to raw amount (6 decimals)
    const tokensToRaw = (tokens) => {
        return Math.floor(Number(tokens) * 1_000_000);
    };

    const registerProposal = async () => {
       
    }
    return (
        <div className="card">
            <h2>📝 Register Proposal</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                registerProposal();
            }}>
                <input type="text" placeholder="Proposal Description" value={proposalDescription} onChange={(e) => setProposalDescription(e.target.value)} />
                <input type="datetime-local" placeholder="Deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <input type="number" step="0.01" placeholder="Token Stake Amount" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
                <button type="submit">Register Proposal</button>
            </form>
        </div>
    )
}

export default RegisterProposal;
