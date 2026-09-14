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
        const provider = getProvider();
        const program = new anchor.Program(idlWithAddress, provider);

        let [xMintPda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode(SEEDS.X_MINT)],
            program.programId,
        );
         
        try { 
            const tokenAccount = await getAssociatedTokenAddress(xMintPda, provider.wallet.publicKey);
            const accountInfo = await getAccount(connection, tokenAccount);
            setBalance(Number(accountInfo.amount));
        } catch (error) {
            console.error("Error fetching token balance or no balance found:", error);
            setBalance(0);
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
