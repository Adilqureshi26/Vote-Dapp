import React from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { useState } from 'react';

const CloseProposal = ({ walletAddress, idlWithAddress, getProvider }) => {
    const [proposalId, setProposalId] = useState('');

    const closeProposal = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet");
            return;
        }
        
    }
    return (
        <div className="card">
            <h2>❌ Close Proposal</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                closeProposal();
            }}>
                <input type="number" placeholder="Proposal ID" value={proposalId} onChange={(e) => setProposalId(e.target.value)} />
                <button type="submit">Close Proposal</button>
            </form>
        </div>
    )
}

export default CloseProposal;
