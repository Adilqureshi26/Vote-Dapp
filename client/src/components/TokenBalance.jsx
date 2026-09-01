import React from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { useState, useEffect } from 'react';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const DECIMALS = 6;

const TokenBalance = ({ walletAddress, idlWithAddress, getProvider, connection }) => {
    const [balance, setBalance] = useState(0);

    const fetchBalance = async () => {
        if (!walletAddress) {
            return;
        }
      
    }

    useEffect(() => {
        fetchBalance();
    }, [walletAddress]);

    return (
        <div className="card">
            <h2>💎 Token Balance</h2>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p className="balance-label">Your voting tokens</p>
                <p className="balance-display">{(balance / Math.pow(10, DECIMALS)).toFixed(DECIMALS)}</p>
            </div>
            <button className="btn-secondary" onClick={fetchBalance}>Refresh Balance</button>
        </div>
    )
}

export default TokenBalance;
