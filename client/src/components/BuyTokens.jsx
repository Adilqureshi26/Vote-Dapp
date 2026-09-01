import React, { useState } from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

const BuyTokens = ({ walletAddress, idlWithAddress, getProvider, connection }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const buyTokens = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet");
            return;
        }

        setLoading(true);
        setStatus('Preparing transaction...');

        try {
           
            // Build a single transaction with all necessary instructions
           

            // Check if ATA exists, if not add creation instruction
            

            // Add buy tokens instruction
            setStatus('Building buy tokens instruction...');
           

            // Send single transaction with all instructions
            setStatus('Please approve the transaction...');
           

            console.log("Transaction successful", tx);
            setStatus('✅ Tokens purchased successfully!');

            // Clear success message after 3 seconds
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error("Error buying tokens:", err);
            if (err.message?.includes('User rejected')) {
                setStatus('❌ Transaction cancelled by user');
            } else {
                setStatus(`❌ Error: ${err.message || 'Transaction failed'}`);
            }
            // Clear error message after 5 seconds
            setTimeout(() => setStatus(''), 5000);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="card">
            <h2>💰 Buy Tokens</h2>
            <p style={{ color: '#a0aec0', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Purchase voting tokens to participate in proposals
            </p>
            <button onClick={buyTokens} disabled={loading}>
                {loading ? 'Processing...' : 'Buy Tokens'}
            </button>
            {status && (
                <p style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    color: status.includes('✅') ? '#48bb78' : status.includes('❌') ? '#fc8181' : '#a0aec0'
                }}>
                    {status}
                </p>
            )}
        </div>
    )
}

export default BuyTokens;
