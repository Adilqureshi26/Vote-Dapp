import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VoteApp } from "../target/types/vote_app";

import { expect } from "chai";
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
// import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";

const SEEDS = {
  SOL_VAULT: "sol_vault",
  TREASURY_CONFIG: "treasury_config",
  MINT_AUTHORITY: "mint_authority",
  X_MINT: "x_mint",
  VOTER: "voter",
  PROPOSAL_COUNTER: "proposal_counter",
  PROPOSAL: "proposal",
  WINNER: "winner"
} as const;

const PROPOSAL_ID = 1;

const findpda = (
  programId: anchor.web3.PublicKey,
  seeds: (Buffer | Uint8Array)[],
): anchor.web3.PublicKey => {
  const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    programId,
  );
  return pda;
};

console.log("Transfering sol...");
const airdrop = async (
  connection: anchor.web3.Connection,
  publicKey: anchor.web3.PublicKey,
  sol: number,
) => {
  const signature = await connection.requestAirdrop(publicKey, sol);
  await connection.confirmTransaction(signature, "confirmed");
};

const getBlockTime = async(connection:anchor.web3.Connection):Promise<number>=>{
  const slot = await connection.getSlot();
  const blockTime = await connection.getBlockTime(slot)
  if(blockTime === null){
    throw new Error("Failed to fetch the block time")
  }
  return blockTime;
}

const expectAnchorErrorCode = (err: unknown, expectedCode: string) => {
  const anyErr = err as any;
  const actualCode = 
  anyErr?.error?.errorCode?.code ??
  anyErr?.errorCode?.code ??
  anyErr?.code;
  expect(actualCode).to.equal(expectedCode); 
}

describe("Testing the voting app", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.voteApp as Program<VoteApp>;
  const connection = provider.connection;

  const adminWallet = (provider.wallet as NodeWallet).payer;
  let proposalCreatorWallet = new anchor.web3.Keypair();
  let voterWallet = new anchor.web3.Keypair();
  let proposalCreatorTokenAccount: anchor.web3.PublicKey;
  let treasuryConfigPda: anchor.web3.PublicKey;
  let xMintPda: anchor.web3.PublicKey;
  let solVaultPda: anchor.web3.PublicKey;
  let mintAuthorityPda: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let voterPda: anchor.web3.PublicKey; 
  let proposalCounterPda: anchor.web3.PublicKey;
  let proposalPda: anchor.web3.PublicKey;
  let voterTokenAccount: anchor.web3.PublicKey;
  let winnerPda: anchor.web3.PublicKey;


  beforeEach(async () => {
    treasuryConfigPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.TREASURY_CONFIG),
    ]);

    proposalPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL),Buffer.from([PROPOSAL_ID])
    ]);

    proposalCounterPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.PROPOSAL_COUNTER),
    ]);

    solVaultPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.SOL_VAULT),
    ]);

    mintAuthorityPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.MINT_AUTHORITY),
    ]);

    xMintPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.X_MINT),
    ]);

    voterPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.VOTER), 
      voterWallet.publicKey.toBuffer()
    ]);

    winnerPda = findpda(program.programId, [
      anchor.utils.bytes.utf8.encode(SEEDS.WINNER),
    ]);

    console.log("Tranfering sol tokens...");
    await Promise.all([
      airdrop(connection, adminWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      airdrop(connection, proposalCreatorWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL),
      airdrop(connection, voterWallet.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    ]);
    console.log("Transfering of SOL Success");
  });

  const createTokenAccount = async () => {
    console.log("Initialization of Token Accounts");
    treasuryTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        adminWallet,
        xMintPda,
        adminWallet.publicKey,
      )
    ).address;

    proposalCreatorTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        proposalCreatorWallet,
        xMintPda,
        proposalCreatorWallet.publicKey,
      )
    ).address;

    voterTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        voterWallet,
        xMintPda,
        voterWallet.publicKey,
      )
    ).address;
  };
  describe("1.Initiazation", () => {
    it("1.1 initializes treasury!", async () => {
      const solPrice = new anchor.BN(1000_000_000);
      const tokenPerPurchase = new anchor.BN(1000_000_000);

      await program.methods
        .initializeTreasury(solPrice, tokenPerPurchase)
        .accounts({
          authority: adminWallet.publicKey,
        })
        .rpc();

      const treasuryAccountData = await program.account.treasuryConfig.fetch(
        treasuryConfigPda,
      );
      expect(treasuryAccountData.solPrice.toNumber()).to.equal(
        solPrice.toNumber(),
      );
      expect(treasuryAccountData.tokenPerPerchase.toNumber()).to.equal(
        tokenPerPurchase.toNumber(),
      );
      expect(treasuryAccountData.authority.toBase58()).to.equal(
        adminWallet.publicKey.toBase58(),
      );
      //verify the mint PDA is stored correctly
      expect(treasuryAccountData.xMints.toBase58()).to.equal(
        xMintPda.toBase58(),
      );
      await createTokenAccount();
    });
  });

  describe("2. Buy Tokens", () => {
    it("2.1 Buys Tokens for Proposal Creator!", async () => {
      const tokenBalanceBefore = ((await getAccount(connection, proposalCreatorTokenAccount)).amount)

      await program.methods
        .buyTokens()
        .accounts({
          buyer: proposalCreatorWallet.publicKey,
          treasuryTokenAccount: treasuryTokenAccount,
          buyerTokenAccount: proposalCreatorTokenAccount,
          xMint: xMintPda
        }).signers([proposalCreatorWallet])
        .rpc();

        const tokenBalanceAfter = ((await getAccount(connection,proposalCreatorTokenAccount)).amount)
        expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000_000_000));
    });

      it("2.2 Buys Tokens for Voter!", async () => {
      const tokenBalanceBefore = ((await getAccount(connection, voterTokenAccount)).amount)

      await program.methods
        .buyTokens()
        .accounts({
          buyer: voterWallet.publicKey,
          treasuryTokenAccount: treasuryTokenAccount,
          buyerTokenAccount: voterTokenAccount,
          xMint: xMintPda
        }).signers([voterWallet])
        .rpc();

        const tokenBalanceAfter = ((await getAccount(connection,voterTokenAccount)).amount)
        expect(tokenBalanceAfter-tokenBalanceBefore).to.equal(BigInt(1000_000_000));
    });
  });

  describe("3. Voters", () => {
    it("3.1 Registers Voters!", async () => {

      await program.methods.registerVoter().accounts({
        authority: voterWallet.publicKey
        }).signers([voterWallet]).rpc();
        const voterAccountData = await program.account.voter.fetch(voterPda);
        expect(voterAccountData.voterId.toBase58()).to.equal(voterWallet.publicKey.toBase58());
    });
  });

  describe("4. Proposal Registration", () => {
    it("4.1 Registers Proposal!", async () => {
      const currentBlockTime = await getBlockTime(connection);
      const deadLineTime = new anchor.BN(currentBlockTime + 10);
      const proposalInfo = "Build a layer 2 solution";
      const stakeAmount = new anchor.BN(1000);

      await program.methods.registerProposal(proposalInfo,deadLineTime,stakeAmount).accounts({
          authority:proposalCreatorWallet.publicKey,
          proposalTokenAccount: proposalCreatorTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          xMint: xMintPda,
        }).signers([proposalCreatorWallet]).rpc();
        const proposalAccountData = await program.account.proposal.fetch(proposalPda);
        const proposalCounterAccountData = await program.account.proposalCounter.fetch(proposalCounterPda);
        expect(proposalCounterAccountData.proposalCount).to.equal(2);
        
        expect(proposalAccountData.authority.toBase58()).to.equal(proposalCreatorWallet.publicKey.toBase58());
        expect(proposalAccountData.deadline.toString()).to.equal(deadLineTime.toString());
        expect(proposalAccountData.numberOfVotes.toString()).to.equal("0");
        expect(proposalAccountData.proposalId.toString()).to.equal("1");
        expect(proposalAccountData.proposalInfo.toString()).to.equal("Build a layer 2 solution");
    });
  });

   describe("5. Casting Votes", () => {
    const stakeAmount = new anchor.BN(1000);
    it("5.1 Casts Vote!", async () => {
      await program.methods.proposalToVote(PROPOSAL_ID, stakeAmount).accounts({
          authority:voterWallet.publicKey,
          voterTokenAccount: voterTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          xMint: xMintPda,
        }).signers([voterWallet]).rpc();       
    });
  });
  
    describe("6, Picking Winner", () => {
    it("6.1 Should fail to pick winner before deadline passes!", async () => {
      try{
        await program.methods
        .pickWinner(PROPOSAL_ID)
        .accounts({
          authority: adminWallet.publicKey,
        }).rpc();
      }catch(error){
        expectAnchorErrorCode(error, "VotingStillActive");
      }
    });

    it("6.2 should pick winner after deadline passes!", async () => {
      // Wait for deadline to pass
      console.log("Waiting for deadline to pass...");
      await new Promise((resolve) => setTimeout(resolve, 12000)); // Wait for 12 seconds

      await program.methods
        .pickWinner(PROPOSAL_ID)
        .accounts({
          authority: adminWallet.publicKey,
        }).rpc();

        const winnerData = await program.account.winner.fetch(winnerPda);
        expect(winnerData.winnerProposalId.toString()).to.equal(PROPOSAL_ID.toString());
        expect(winnerData.winningVotes.toString()).to.equal("1");
    });
  });

  describe("7. Close Proposal", () => {
    it("7.1 Should close proposal after deadline and rent recovered!", async () => {
      const accountInfoBefore = await connection.getAccountInfo(proposalPda);
      expect(accountInfoBefore).to.not.be.null;

      await program.methods
        .closeProposal(PROPOSAL_ID)
        .accounts({
          destination: proposalCreatorWallet.publicKey,
          authority: proposalCreatorWallet.publicKey,
        }).signers([proposalCreatorWallet]).rpc();   

      const accountInfoAfter = await connection.getAccountInfo(proposalPda);
      expect(accountInfoAfter).to.be.null;
    });
  });

   describe("8. Close Voter", () => {
    it("8.1 Should close voter account and recover rent!", async () => {
      const accountInfoBefore = await connection.getAccountInfo(voterPda);
      expect(accountInfoBefore).to.not.be.null;

      const voterBalanceBefore = await connection.getBalance(voterWallet.publicKey);
      console.log(`Voter balance before: ${voterBalanceBefore}`);

      await program.methods
        .closeVoter()
        .accounts({
          authority: voterWallet.publicKey,
        }).signers([voterWallet]).rpc();   

      const accountInfoAfter = await connection.getAccountInfo(voterPda);
      expect(accountInfoAfter).to.be.null;

      const voterBalanceAfter = await connection.getBalance(voterWallet.publicKey);
      expect(voterBalanceAfter).to.be.greaterThan(voterBalanceBefore);
      console.log(`Voter balance after: ${voterBalanceAfter}`);
    });
  });

  describe("9. Withdraw SOL", () => {
    it("9.1 Should allow admin to withdraw SOL from the vault/treasury!", async () => {
      const withdrawAmount = new anchor.BN(100_000); 
      const adminBalanceBefore = await connection.getBalance(adminWallet.publicKey);
      // console.log(`Admin balance before: ${adminBalanceBefore}`);

      // First check if the balance of SOL in the vault is enough to withdraw.
      const vaultBalance = await connection.getBalance(solVaultPda);
      if (vaultBalance >= withdrawAmount.toNumber()) {
      await program.methods
        .withdrawSol(withdrawAmount)
        .accounts({
          authority: adminWallet.publicKey,
        }).signers([adminWallet]).rpc();

      const adminBalanceAfter = await connection.getBalance(adminWallet.publicKey);
      // Balance should increase (minus transaction fees) 
      expect(adminBalanceAfter).to.be.greaterThan(adminBalanceBefore - 100000); // accounting for transaction fees 
      // console.log(`Admin balance after: ${adminBalanceAfter}`);
      } else {
        console.log("Not enough SOL in the vault to withdraw.");
      }
    });

    it("9.2 Should fail if non-admin tries to withdraw SOL!", async () => {
      const withdrawAmount = new anchor.BN(100_000); 

      try {
        await program.methods
          .withdrawSol(withdrawAmount)
          .accounts({
            authority: voterWallet.publicKey, // Non-admin trying to withdraw
          }).signers([voterWallet]).rpc();
          expect.fail("Expected withdrawal to fail - unauthorized user");
      } catch (error) {
        expectAnchorErrorCode(error, "UnauthorizedAccess");
      }
    });
  });
});
 