use anchor_lang::prelude::*;
#[error_code]
pub enum VoterError{
    #[msg("Invalid deadline passed")]
    InvalidDeadline,

    #[msg("Proposal counter already initialized")]
    ProposalCounterAlreadyInitialized,

    #[msg("Proposal Counter Overflow")]
    ProposalCounterOverflow,

    #[msg("Proposal has ended")]
    ProposalEnded,

    #[msg("Proposal Votes Overflow")]
    ProposalVotesOverflow,

    #[msg("Voting is still active - can not declare Winner")]
    VotingStillActive,

    #[msg("No votes to cast")]
    NoVotesToCast,

     #[msg("The user is not authorized")]
    UnauthorizedAccess,

      #[msg("Token mint does not match")]
    TokenMintMismatch,
}