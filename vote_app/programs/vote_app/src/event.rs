use anchor_lang::prelude::*;
#[event]
pub struct VoterAccountClosed {
    pub voter: Pubkey,
    pub rent_recovered_to: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProposalCreated {
    pub proposal_id: u8,
    pub creator: Pubkey,
    pub proposal_info: String,
    pub deadline: i64,
    pub timestamp: i64,
}

#[event]
pub struct SolWithdrawn {
    pub authority: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}