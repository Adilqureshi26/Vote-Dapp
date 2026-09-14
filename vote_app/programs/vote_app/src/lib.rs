use anchor_lang::prelude::*;
mod context;
mod error;
mod state;
mod event;
use context::*;
use error::*;
use event::*;
declare_id!("GoqWVuJpZKztNrydkkKtLMPFtQqNsnZyiD9Nrwqdmv9d");
use anchor_lang::system_program;
use anchor_spl::token::{mint_to, transfer, MintTo, Transfer};

#[program]
pub mod vote_app {
    // use anchor_lang::Bump;

    // use crate::state::{Proposal, Voter};

    // use std::task::Context;

use anchor_lang::accounts::signer;
use anchor_spl::token_interface::spl_token_metadata_interface::instruction::emit;

use crate::state::Voter;

use super::*;

    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        sol_price: u64,
        token_per_perchase: u64,
    ) -> Result<()> {
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        treasury_config_account.authority = ctx.accounts.authority.key();
        treasury_config_account.bump = ctx.bumps.sol_vault;
        treasury_config_account.sol_price = sol_price;
        treasury_config_account.x_mints = ctx.accounts.x_mint.key();
        treasury_config_account.token_per_perchase = token_per_perchase;
        treasury_config_account.treasury_token_account = ctx.accounts.treasury_token_account.key();

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        require!(
            proposal_counter_account.proposal_count == 0,
            VoterError::ProposalCounterAlreadyInitialized
        );
        proposal_counter_account.proposal_count = 1;
        proposal_counter_account.authority = ctx.accounts.authority.key();
        Ok(())
    }
    pub fn buy_tokens(ctx: Context<BuyTokens>) -> Result<()> {
        //1. Buyer will transfer SOL from buyer account to sol_vault,
        // This is CPI. Transfering money from one account to another account. Syntax is shown as below.

        // treasury_config_account - sol price and token amount to transfer
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        let sol = treasury_config_account.sol_price;
        let token_amount = treasury_config_account.token_per_perchase;

        let transfer_ix = anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_ix),
            sol,
        )?;
        //2. Mint tokens to buyer token account.
        let mint_authority_seeds = &[b"mint_authority".as_ref(), &[ctx.bumps.mint_authority]];
        let signer_seeds = &[&mint_authority_seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.x_mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        //3. X mint token.
        mint_to(cpi_ctx, token_amount)?;

        Ok(())
    }

    pub fn register_voter(ctx: Context<RegisterVoter>) -> Result<()> {
        let voter_account = &mut ctx.accounts.voter_account;
        voter_account.voter_id = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn register_proposal(
        ctx: Context<RegisterProposal>,
        proposal_info: String,
        deadline: i64,
        token_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(deadline > clock.unix_timestamp, VoterError::InvalidDeadline);
        let proposal_account = &mut ctx.accounts.proposal_account;
        // Transfer tokens from proposal_token_account to treasury_token_account.

        let cpi_accounts = Transfer {
            from: ctx.accounts.proposal_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        // transfer of tokens
        transfer(cpi_ctx, token_amount)?;

        proposal_account.proposal_info = proposal_info;
        proposal_account.deadline = deadline;
        proposal_account.authority = ctx.accounts.authority.key();

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        proposal_account.proposal_id = proposal_counter_account.proposal_count;
        proposal_counter_account.proposal_count = proposal_counter_account
            .proposal_count
            .checked_add(1)
            .ok_or(VoterError::ProposalCounterOverflow)?;

        emit!(ProposalCreated {
            proposal_id: proposal_account.proposal_id,
            creator: proposal_account.authority,
            proposal_info: proposal_account.proposal_info.clone(),
            deadline: proposal_account.deadline,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

     pub fn proposal_to_vote(
        ctx: Context<Vote>,
        proposal_id: u8,
        token_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let proposal_account = &mut ctx.accounts.proposal_account;
        require!(proposal_account.deadline > clock.unix_timestamp, VoterError::ProposalEnded);
        // Transfer tokens from proposal_token_account to treasury_token_account.

        let cpi_accounts = Transfer {
            from: ctx.accounts.voter_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        // transfer of tokens
        transfer(cpi_ctx, token_amount)?;

        let voter_account = &mut ctx.accounts.voter_account;
        voter_account.proposal_voted = proposal_id;

        proposal_account.number_of_votes = proposal_account.number_of_votes.checked_add(1).ok_or(VoterError::ProposalVotesOverflow)?;
        Ok(())
    }

    pub fn pick_winner(ctx: Context<PickWinner>, proposal_id: u8) -> Result<()> {
        let clock = Clock::get()?;
        let proposal = &ctx.accounts.proposal_account;
        let winner = &mut ctx.accounts.winner_account;

        //Ensure voting deadline has not passed
        require!(proposal.deadline <= clock.unix_timestamp, VoterError::VotingStillActive);

        //Check if the proposal has any votes
        require!(proposal.number_of_votes > 0, VoterError::NoVotesToCast);

        //Update winner if this proposal has more votes (or if no winner has been declared yet)
        if winner.winning_votes < proposal.number_of_votes {
            winner.winner_proposal_id = proposal_id;
            winner.winning_votes = proposal.number_of_votes;
            winner.proposal_info = proposal.proposal_info.clone();
            winner.declared_at = clock.unix_timestamp;
        }
        Ok(())
    }

    pub fn close_proposal(ctx: Context<CloseProposal>, _proposal_id: u8) -> Result<()> {
        let clock = Clock::get()?;
        let proposal = &ctx.accounts.proposal_account;

        //Can only close when voting ends
        require!(proposal.deadline <= clock.unix_timestamp, VoterError::VotingStillActive);
        // Account will be closed automatically when the function ends due to the `close` attribute in the `CloseProposal` context. The funds will be transferred to the `destination` account specified in the context.
        Ok(())
    }

    pub fn close_voter(ctx: Context<CloseVoter>) -> Result<()> {
        emit!(VoterAccountClosed {
            voter: ctx.accounts.voter_account.voter_id,
            rent_recovered_to: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        // Account will be closed by the `close` constraint.
        Ok(())
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        let treasury_config = &ctx.accounts.treasury_config;

        //Use PDA signing to send SOL from the sol_vault to the authority account.
        let sol_vault_seeds = &[b"sol_vault".as_ref(), &[treasury_config.bump]];
        let signer_seeds = &[&sol_vault_seeds[..]];

        require!(
            treasury_config.authority == ctx.accounts.authority.key(),
            VoterError::UnauthorizedAccess
        );

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.sol_vault.to_account_info(),
            to: ctx.accounts.authority.to_account_info(),
        };

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(), 
                transfer_ix,
                signer_seeds
            ),
            amount,
        )?;

        emit!(SolWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
