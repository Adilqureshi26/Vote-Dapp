import React, { useState, useEffect } from 'react'
import { SEEDS } from '../constants/constants';
import { PublicKey } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";

const AllProposals = ({ walletAddress, idlWithAddress, getProvider }) => {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('active'); // 'active', 'ended', 'all'

    const fetchAllProposals = async () => {
        if (!walletAddress) {
            setError("Please connect your wallet");
            return;
        }

        setLoading(true);
        setError('');
        setProposals([]);

        try {
          
        } catch (err) {
            console.error("Error fetching proposals:", err);
            setError('Failed to fetch proposals');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (walletAddress) {
            fetchAllProposals();
        }
    }, [walletAddress]);

    const formatDeadline = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    const getTimeRemaining = (deadline) => {
        const now = Math.floor(Date.now() / 1000);
        const diff = deadline - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
        return `${seconds}s remaining`;
    };

    const filteredProposals = proposals.filter(p => {
        if (filter === 'active') return p.isActive;
        if (filter === 'ended') return !p.isActive;
        return true;
    });

    const sortedProposals = [...filteredProposals].sort((a, b) => {
        // Active proposals first, then by deadline
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.deadline - a.deadline;
    });

    return (
        <div className="card all-proposals-card">
            <h2>📋 All Proposals</h2>

            <div className="proposals-header">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Active ({proposals.filter(p => p.isActive).length})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'ended' ? 'active' : ''}`}
                        onClick={() => setFilter('ended')}
                    >
                        Ended ({proposals.filter(p => !p.isActive).length})
                    </button>
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({proposals.length})
                    </button>
                </div>
                <button className="btn btn-secondary refresh-btn" onClick={fetchAllProposals} disabled={loading}>
                    🔄 {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {error && <p className="error-text">{error}</p>}

            {loading && <p className="info-text">Loading proposals...</p>}

            {!loading && sortedProposals.length === 0 && !error && (
                <p className="info-text">No {filter !== 'all' ? filter : ''} proposals found.</p>
            )}

            <div className="proposals-list">
                {sortedProposals.map((proposal) => (
                    <div key={proposal.id} className={`proposal-item ${proposal.isActive ? 'active' : 'ended'}`}>
                        <div className="proposal-header">
                            <span className="proposal-id">#{proposal.id}</span>
                            <span className={`status-badge ${proposal.isActive ? 'registered' : 'not-registered'}`}>
                                {proposal.isActive ? '🟢 Active' : '🔴 Ended'}
                            </span>
                        </div>
                        <div className="proposal-content">
                            <p className="proposal-info">{proposal.info}</p>
                            <div className="proposal-stats">
                                <div className="stat">
                                    <span className="stat-label">Votes</span>
                                    <span className="stat-value">{proposal.votes}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Time</span>
                                    <span className="stat-value time">{getTimeRemaining(proposal.deadline)}</span>
                                </div>
                            </div>
                            <p className="proposal-deadline">
                                <span className="info-label">Deadline:</span> {formatDeadline(proposal.deadline)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AllProposals;
