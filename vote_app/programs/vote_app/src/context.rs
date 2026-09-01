use anchor_lang::prelude::*;

use crate::state::*;
use crate::error::*;
use anchor_spl::{associated_token::{AssociatedToken, spl_associated_token_account::solana_program::vote::error::VoteError}, token::{Mint,Token,TokenAccount}};

#[derive(Accounts)]
pub struct InitializeTreasury<'info>{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, payer = authority, space = 8 + TreasuryConfig::INIT_SPACE, seeds=[b"treasury_config"], bump)]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    #[account(init,payer=authority, mint::authority=mint_authority, mint::decimals = 6, seeds=[b"x_mint"],bump)]
    pub x_mint:Account<'info, Mint>,

    #[account(init,payer=authority, associated_token::mint = x_mint, associated_token::authority = authority,)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(init, payer = authority, space = 8 + ProposalCounter::INIT_SPACE, seeds=[b"proposal_counter"], bump)]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    /// CHECK:This is only to recieve Sol tokens
    #[account(mut,seeds=[b"sol_vault"],bump)]
    pub sol_vault: AccountInfo<'info>,
    
    /// CHECK:This is going to be the mint authority of x_mint tokens
    #[account(mut,seeds=[b"mint_authority"],bump)]
    pub mint_authority:AccountInfo<'info>,

    pub token_program:Program<'info,Token>,

    pub associated_token_program:Program<'info,AssociatedToken>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
     #[account(
        seeds=[b"treasury_config"],
        bump,
        constraint=treasury_config_account.x_mints == x_mint.key()
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,


    /// CHECK:This is only to recieve Sol tokens
    #[account(mut,seeds=[b"sol_vault"],bump = treasury_config_account.bump)]
    pub sol_vault: AccountInfo<'info>,

    /// CHECK:This is going to be the mint authority of x_mint tokens
    #[account(mut,seeds=[b"mint_authority"],bump)]
    pub mint_authority:AccountInfo<'info>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub x_mint:Account<'info, Mint>,

    #[account(
        mut, 
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == x_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program:Program<'info,Token>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct RegisterVoter<'info>{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority, 
        space = 8 + Voter::INIT_SPACE, 
        seeds=[b"voter", authority.key().as_ref()], 
        bump
    )]
    pub voter_account: Account<'info, Voter>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct RegisterProposal<'info>{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init, payer = authority, space = 8 + Proposal::INIT_SPACE, seeds=[b"proposal",proposal_counter_account.proposal_count.to_be_bytes().as_ref()], bump)]
    pub proposal_account: Account<'info, Proposal>,

    #[account(mut, seeds=[b"proposal_counter"], bump)]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    pub x_mint:Account<'info, Mint>,

    #[account(
        mut, 
        constraint = proposal_token_account.mint == x_mint.key(),
        constraint = proposal_token_account.owner == authority.key()
    )]
    pub proposal_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = treasury_token_account.mint == x_mint.key())]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program:Program<'info,Token>,

    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(proposal_id: u8)]
pub struct Vote<'info>{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, seeds=[b"voter", authority.key().as_ref()], bump,
        constraint = voter_account.proposal_voted == 0)]
    pub voter_account: Account<'info, Voter>,

    pub x_mint:Account<'info, Mint>,

    #[account(mut, constraint = voter_token_account.mint == x_mint.key() @ VoterError::TokenMintMismatch, 
    constraint = voter_token_account.owner == authority.key() @ VoterError::UnauthorizedAccess,
    constraint = voter_token_account.amount > 0)] // I have added this constraint to ensure that the voter has some tokens to vote with.
    pub voter_token_account: Account<'info, TokenAccount>,

    #[account(mut, constraint = treasury_token_account.mint == x_mint.key() @ VoterError::TokenMintMismatch)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds=[b"proposal", proposal_id.to_be_bytes().as_ref()], bump)] 
    pub proposal_account: Account<'info, Proposal>,

    pub token_program:Program<'info,Token>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u8)]
pub struct PickWinner<'info>{

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Winner::INIT_SPACE,
        seeds=[b"winner"],
        bump
    )]
    pub winner_account: Account<'info, Winner>,

    #[account(seeds=[b"proposal", proposal_id.to_be_bytes().as_ref()], bump)] 
    pub proposal_account: Account<'info, Proposal>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>, 
}

#[derive(Accounts)]
#[instruction(proposal_id: u8)]
pub struct CloseProposal<'info>{
    #[account(mut, seeds=[b"proposal", proposal_id.to_be_bytes().as_ref()], 
    bump,
    close = destination,
    constraint = proposal_account.authority == authority.key() @ VoterError::UnauthorizedAccess
    )]
    pub proposal_account: Account<'info, Proposal>,

    /// The account that receive the rent
    /// CHECK: This is safe  - just receives lamports 
    #[account(mut)]
    pub destination: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseVoter<'info>{
    #[account(
        mut, 
        seeds=[b"voter", authority.key().as_ref()],
        bump,
        close = authority
    )]
    pub voter_account: Account<'info, Voter>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info>{
    #[account( 
        seeds=[b"treasury_config"],
        bump,
        constraint = treasury_config.authority == authority.key() @ VoterError::UnauthorizedAccess
    )]
    pub treasury_config: Account<'info, TreasuryConfig>,

    /// the sol vault PDA
    /// CHECK: This is a PDA that holds sol, validated by seeds.
    #[account(
        mut,
        seeds=[b"sol_vault"],
        bump = treasury_config.bump
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
