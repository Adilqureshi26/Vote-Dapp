import React from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";

const CloseVoter = ({ walletAddress, idlWithAddress, getProvider }) => {
    const closeVoter = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet");
            return;
        }
       
    }
    return (
        <div className="card">
            <h2>🚪 Close Voter Account</h2>
            <p style={{ color: '#a0aec0', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Remove your voter registration and reclaim rent
            </p>
            <button onClick={closeVoter}>Close Voter</button>
        </div>
    )
}

export default CloseVoter;
