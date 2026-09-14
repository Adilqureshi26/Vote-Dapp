import * as anchor from "@coral-xyz/anchor";
import { useState } from 'react';

const InitializeTreasury = ({ walletAddress, idlWithAddress, getProvider }) => {
    const [solPrice, setSolPrice] = useState('');
    const [tokensPerPurchase, setTokensPerPurchase] = useState('');
    const [error, setError] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const solToLamports = (sol) => {
        return Math.floor(Number(sol) * 1_000_000_000);
    };

    // Convert tokens to raw amount (6 decimals)
    const tokensToRaw = (tokens) => {
        return Math.floor(Number(tokens) * 1_000_000);
    };

    const initializeTreasury = async () => {
       if (!walletAddress) {
            alert("Please connect your wallet");
            return;
        }

        const solLamports = solToLamports(solPrice);
        const tokens = tokensToRaw(tokensPerPurchase);
        if (!Number.isSafeInteger(solLamports) || solLamports <= 0 || !Number.isSafeInteger(tokens) || tokens <= 0) {
            setError("Enter a positive SOL price and a positive token amount.");
            return;
        }

        setError('');
        setIsInitializing(true);
        try {
            const provider = getProvider();
            const program = new anchor.Program(idlWithAddress, provider);

            // The IDL contains all PDA and program-address constraints, so
            // Anchor 0.32 resolves the remaining accounts from the authority.
            const tx = await program.methods
                .initializeTreasury(new anchor.BN(solLamports), new anchor.BN(tokens))
                .accounts({ authority: provider.wallet.publicKey })
                .rpc();
            console.log("Treasury initialized with transaction: ", tx);
        } catch (err) {
            console.error("Treasury initialization failed:", err);
            setError(err?.transactionMessage || err?.message || "Treasury initialization failed.");
        } finally {
            setIsInitializing(false);
        }
    }
    return (
        <div className="card">
            <h2>🏦 Initialize Treasury</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                initializeTreasury();
            }}>
                <input type="number" step="0.001" placeholder="SOL Price (e.g., 1 for 1 SOL)" value={solPrice} onChange={(e) => setSolPrice(e.target.value)} />
                <input type="number" step="0.01" placeholder="Tokens Per Purchase (e.g., 1000)" value={tokensPerPurchase} onChange={(e) => setTokensPerPurchase(e.target.value)} />
                <button type="submit" disabled={isInitializing}>
                    {isInitializing ? 'Initializing...' : 'Initialize Treasury'}
                </button>
            </form>
            {error && <p className="error-text">{error}</p>}
        </div>
    )
}

export default InitializeTreasury;
