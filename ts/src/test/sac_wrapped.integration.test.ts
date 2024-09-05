import {
  Asset, AuthRequiredFlag, AuthRevocableFlag,
  contract,
  Horizon,
  Keypair,
  Operation,
  rpc, Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { afterAll, beforeAll, beforeEach, describe, it } from "@jest/globals";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

import * as process from "node:process";
// @ts-ignore
import { TokenClient } from "../bindings/token";
// @ts-ignore
import { WrappedClient } from "../bindings/wrapped_client";
// @ts-ignore
import { TokenControllerClient } from "../bindings/controller";
// @ts-ignore
import { SwapClient } from "../bindings/swap";
import BalanceLineAsset = Horizon.HorizonApi.BalanceLineAsset;
import {AuthFlag} from "@stellar/stellar-base";

export * as rpc from "@stellar/stellar-sdk/rpc";
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);
const network = "Test SDF Network ; September 2015";
const rpcUrl = "https://soroban-testnet.stellar.org";
const rpcServer = new rpc.Server(rpcUrl);
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

describe("Integration tests for wrapped Stellar Asset Contract", () => {
  dotenv.config();
  let command = "stellar";
  // GCOSDE5QHBD6XZNBI3JNVTCNYHVSFLXYCIOAHH72KXGRYPULEAOEBBV3
  let regularSacIssuer = Keypair.fromSecret(
      "SC6WGHCO3HPRMD24JZDFBRE2FSF5AWNOF5SRZOCZPYIGU5VGQ33FOKJW",
  );
  // GDF7FZPAMPF2A3CUNJPNTR4KEDT2O4MZIDFWMS7HLICQURYP3VYH27PY
  let wrappedIssuer = Keypair.fromSecret(
    "SBTQH5SNCECA55HDOBURWU6YYYFEY2X7YQVIR7VRFGJUVRSPXMN3XIZP",
  );
  // GD3FK5LMPLW5EXNZW2M22FWJLAXAOGRBMR2U3QH257PMSPYHKVXAF5NR
  let admin = Keypair.fromSecret(
    "SCRBZIUSSKPAMCNBQNQQLKRYBYHEP3ZKUDUIZXPPYUVSEET5R6R56YIE",
  );
  // GASWA5TV26JSXSN6GQYAVTPIASCMY4PZ4EP74DKRL5JWWBLHALSZVVL4
  let alice = Keypair.fromSecret(
    "SBHUNZPOKB2V7CEQ7KZNUI22FJIHRGXI2CS4SSMYS6YYASVAB22YGMTH",
  );
  // GBFS3HC6YVOGNYDXTROOQ6K6WS35SKXNEJCZPEXLGQZ6BCNPA52KZRPF
  let bob = Keypair.fromSecret(
    "SBLUEUFAAAOH7AFGYRTOEU6GWGJE46E6IQHKNJ5LNE2VGBP543X3IKAW",
  );
  // GCTIR5DNCNSG42UDEFXATIS45ZWHKEYBNEGXNPIGUNBHTJCMG56VGX7F
  let submitter = Keypair.fromSecret(
    "SA3Y5QWX73HUDENABF7UX27ZMCDMQMERFSCFTTPCEYMPKIP5DGQRVX2I",
  );

  let sacTokenClient: TokenClient | null;
  let wrappedTokenClient: TokenClient | null;
  let underlyingSACTokenClient: TokenClient | null;
  let wrappedFunctionClient: WrappedClient | null;
  let controllerClient: TokenControllerClient | null;
  let swapClient: SwapClient | null;
  let testContext: TestContext | null;

  beforeAll(() => {
    if (process.env.STELLAR_CLI_PATH) {
      command = process.env.STELLAR_CLI_PATH;
    }
    if (process.env.REGULAR_ISSUER_KEY) {
      regularSacIssuer = Keypair.fromSecret(process.env.REGULAR_ISSUER_KEY);
    }
    if (process.env.ISSUER_KEY) {
      wrappedIssuer = Keypair.fromSecret(process.env.ISSUER_KEY);
    }
    if (process.env.ADMIN_KEY) {
      admin = Keypair.fromSecret(process.env.ADMIN_KEY);
    }
    if (process.env.ALICE_KEY) {
      alice = Keypair.fromSecret(process.env.ALICE_KEY);
    }
    if (process.env.BOB_KEY) {
      bob = Keypair.fromSecret(process.env.BOB_KEY);
    }
    if (process.env.SUBMITTER_KEY) {
      submitter = Keypair.fromSecret(process.env.SUBMITTER_KEY);
    }
    console.log("Using issuer key " + wrappedIssuer.publicKey());
  });

  beforeEach(() => {
    testContext = readContext();
    if (testContext?.sac) {
      sacTokenClient = makeTokenClient(testContext.sac, submitter);
      wrappedTokenClient = makeTokenClient(testContext.wrapper, submitter);
      underlyingSACTokenClient = makeTokenClient(testContext.sac_wrapped, submitter);
      wrappedFunctionClient = new WrappedClient({
        publicKey: wrappedIssuer.publicKey(),
        networkPassphrase: network,
        rpcUrl: rpcUrl,
        contractId: testContext.wrapper,
      });
      controllerClient = new TokenControllerClient({
        publicKey: submitter.publicKey(),
        networkPassphrase: network,
        rpcUrl: rpcUrl,
        contractId: testContext.controller,
      });
      swapClient = new SwapClient({
        publicKey: submitter.publicKey(),
        networkPassphrase: network,
        rpcUrl: rpcUrl,
        contractId: testContext.swap_contract,
      });
    }
  });

  describe("CLI setup", () => {
    console.log("Checking CLI environment");
    it("CLI should be available", async () => {
      let { stdout, stderr } = await exec(command + " --version");
      expect(stderr).toBe("");
    });
    it("cli should import keys", async () => {
      await exec(
        "SOROBAN_SECRET_KEY=" +
          wrappedIssuer.secret() +
          " " +
          command +
          " keys add test-issuer-key --secret-key",
      );
      await exec(
        "SOROBAN_SECRET_KEY=" +
          admin.secret() +
          " " +
          command +
          " keys add test-admin-key --secret-key",
      );
      let { stdout, __ } = await exec(command + " keys ls");
      const str: string = stdout;
      expect(str).toContain("test-admin-key");
      expect(str).toContain("test-issuer-key");
    });
    afterAll(() => {
      console.log("CLI OK");
    });
  });

  describe("Test setup", () => {
    it("Should create SAC", async () => {
      if (testContext && testContext.sac) {
        console.log("Loaded contract from cache " + testContext.sac);
        return;
      }

      async function deploySAC(issuer: Keypair) {
        let ticker = (Math.random() * 1337)
          .toString(36)
          .replaceAll(/[0-9]|\./g, "")
          .toUpperCase()
          .substring(0, 12);
        expect(ticker.length).toBeGreaterThan(2);
        console.log("Deploying test asset " + ticker);
        let asset = ticker + ":" + issuer.publicKey();
        const { stdout, stderr } = await exec(
          command +
            " contract asset deploy --asset " +
            asset +
            " --source-account test-issuer-key --network testnet",
        );
        expect(stderr).toBe("");
        const contract: string = stdout.trim();

        return { contract, asset };
      }

      async function submitTransaction(tx: Transaction) {
        const result = await rpcServer.sendTransaction(tx);
        const hash = result.hash;
        console.log("Sent transaction: " + hash);

        // >> TODO [sdk]: is this piece of code somewhere in the SDK? If not, should it be there?
        for (let i = 0; i <= 30; i++) {
          const txResult = await rpcServer.getTransaction(hash);
          if (txResult.status == rpc.Api.GetTransactionStatus.NOT_FOUND) {
            await new Promise((r) => setTimeout(r, 1000));
            expect(i).toBeLessThan(30);
          } else {
            expect(txResult.status).toBe(rpc.Api.GetTransactionStatus.SUCCESS);
            break;
          }
        }
        // <<
      }

      async function addTrustline(asset: string, kp: Keypair) {
        let aliceAccount = await rpcServer.getAccount(kp.publicKey());
        let code = asset.split(":")[0]
        let issuer = asset.split(":")[1]

        let aliceTrust = new TransactionBuilder(aliceAccount, {
          fee: "1000",
          timebounds: { minTime: 0, maxTime: 0 },
          networkPassphrase: network,
        })
          .addOperation(
            Operation.changeTrust({
              asset: new Asset(code, issuer),
            }),
          )
          .build();
        aliceTrust.sign(kp);
        await submitTransaction(aliceTrust);

        console.log("Trustline set for " + kp.publicKey());
      }

      async function deploy_contract(contract_name: string) {
        const { stdout, stderr } = await exec(
          command +
            " contract deploy --source-account test-issuer-key --network testnet --wasm target/wasm32-unknown-unknown/release/" +
            contract_name +
            ".wasm",
        );
        expect(stderr).toBe("");
        const output: string = stdout;
        // TODO [cli] improve output
        const contract = output.split("Deployed!")[1].trim();
        console.log("Deployed " + contract_name + ": " + contract);
        return contract;
      }

      let sac = await deploySAC(regularSacIssuer);
      console.log("Deployed SAC contract " + sac.contract);
      let sac_wrapped = await deploySAC(wrappedIssuer);
      console.log("Deployed SAC wrapped contract " + sac_wrapped.contract);

      await addTrustline(sac.asset, alice);
      await addTrustline(sac.asset, bob);
      await addTrustline(sac_wrapped.asset, alice);
      await addTrustline(sac_wrapped.asset, bob);

      let issuerAccount = await rpcServer.getAccount(wrappedIssuer.publicKey());
      let accFlags = new TransactionBuilder(issuerAccount, {
        fee: "1000",
        timebounds: { minTime: 0, maxTime: 0 },
        networkPassphrase: network,
      })
          .addOperation(
              Operation.setOptions({
              setFlags: AuthRequiredFlag
              }),
          ).addOperation(
              Operation.setOptions({
                setFlags: AuthRevocableFlag
              })
          )
          .build();
      accFlags.sign(wrappedIssuer)
      await submitTransaction(accFlags)
      console.log("Updated asset flag accounts")

      let wrapper = await deploy_contract("enforced_classic_asset_wrapper");
      let controller = await deploy_contract("regulated_token_controller");
      let swap = await deploy_contract("swap");

      writeContext({
        asset: sac.asset,
        sac: sac.contract,
        asset_wrapped: sac_wrapped.asset,
        sac_wrapped: sac_wrapped.contract,
        wrapper: wrapper,
        controller: controller,
        swap_contract: swap,
        state: TestState.deployed,
      });
    });

    it("Has contract id", async () => {
      expect(testContext?.asset).toBeDefined();
    });

    // Contract initialization tests that are NOT working (could be a bug or I'm doing something wrong).
    // For working version see below
    // Using admin.publicKey() as the Admin
    it.skip("Should initialize wrapped contract, setting admin", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_initialized) {
        console.log("Wrapped already initialized");
        return;
      }

      // Error with "[recording authorization only] encountered authorization not
      // tied to the root contract invocation for an address. Use `require_auth()` in the top invocation
      // or enable non-root authorization."
      // This error is really strange, because we do have admin.require_auth() call in the contract
      const { stdout, stderr } = await exec(
        command +
          " contract invoke --sim-only --network testnet --source-account test-issuer-key --id " +
          testContext!.wrapper +
          " -- initialize " +
          " --admin " +
          admin.publicKey() +
          " --asset " +
          testContext!.sac_wrapped +
          " --asset_controller " +
          testContext!.controller,
      );

      expect(stderr).toContain("in_successful_contract_call: true");

      testContext!.state = TestState.wrapper_initialized;
      writeContext(testContext!);
    });

    // Using admin-key as the submitter + admin
    // (I assume transaction should be signed by the issuer, as asset.require_auth() is called)
    // Same error as above
    it.skip("Should initialize wrapped contract, setting admin and using admin key", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_initialized) {
        console.log("Wrapped already initialized");
        return;
      }

      // Error with "[recording authorization only] encountered authorization not
      // tied to the root contract invocation for an address. Use `require_auth()` in the top invocation
      // or enable non-root authorization."
      const { stdout, stderr } = await exec(
        command +
          " contract invoke --sim-only --network testnet --source-account test-admin-key --id " +
          testContext!.wrapper +
          " -- initialize " +
          " --admin " +
          admin.publicKey() +
          " --asset " +
          testContext!.sac_wrapped +
          " --asset_controller " +
          testContext!.controller,
      );

      expect(stderr).toContain("in_successful_contract_call: true");

      testContext!.state = TestState.wrapper_initialized;
      writeContext(testContext!);
    });

    it("Should initialize wrapped contract using SDK", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_initialized) {
        console.log("Wrapped already initialized");
        return;
      }

      let tx = await wrappedFunctionClient!.initialize({
        admin: wrappedIssuer.publicKey(),
        asset: testContext!.sac_wrapped,
        asset_controller: testContext!.controller,
      });

      console.log(tx.toXDR());
      console.log(tx.needsNonInvokerSigningBy());

      await tx.simulate();
      await tx.sign({
        signTransaction: signer(wrappedIssuer).signTransaction,
      });

      let result = await tx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Init wrapped contract transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );
    });

    // Same version as above just using cli
    it.skip("Should initialize wrapped contract", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_initialized) {
        console.log("Wrapped already initialized");
        return;
      }

      const { stdout, stderr } = await exec(
        command +
          " contract invoke --network testnet --source-account test-issuer-key --id " +
          testContext!.wrapper +
          " -- initialize " +
          " --admin " +
          wrappedIssuer.publicKey() +
          " --asset " +
          testContext!.sac_wrapped +
          " --asset_controller " +
          testContext!.controller,
      );

      expect(stderr).toContain("in_successful_contract_call: true");

      testContext!.state = TestState.wrapper_initialized;
      writeContext(testContext!);
    });

    it("Should set admin", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_admin_changed) {
        console.log("Admin account has already been set");
        return;
      }

      await exec(
        command +
          " contract invoke --id " +
          testContext!.wrapper +
          " --network testnet --source-account test-issuer-key -- set_admin --new_admin " +
          admin.publicKey(),
      );

      const { stdout, stderr } = await exec(
        command +
          " contract invoke --id " +
          testContext!.wrapper +
          " --network testnet --source-account test-issuer-key -- get_admin",
      );

      expect(stdout).toContain(admin.publicKey());

      console.log("Set wrapper admin to " + admin.publicKey());

      testContext!.state = TestState.wrapper_admin_changed;
      writeContext(testContext!);
    });

    it("Should initialize controller", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.controller_initialized) {
        console.log("Controller contract has already been initialized");
        return;
      }

      const { stdout, stderr } = await exec(
        command +
          " contract invoke --id " +
          testContext!.controller +
          " --network testnet --source-account test-admin-key -- initialize --admin " +
          admin.publicKey() +
          " --asset " +
          testContext!.wrapper +
          " --probation_period 360 --quota_time_limit 60 --inflow_limit 100 --outflow_limit 150",
      );

      expect(stderr.trim()).toBe("");
      expect(stdout.trim()).toBe("");

      testContext!.state = TestState.controller_initialized;
      writeContext(testContext!);
    });

    afterAll(() => {
      console.log(
        "Test initialized with context: " + JSON.stringify(testContext),
      );
    });
  });

  describe("Regular SAC test", () => {
    beforeEach(() => {
      expect(sacTokenClient).toBeDefined();
      expect(testContext).toBeDefined();
    });

    it("Can get the name", async () => {
      let tx = await sacTokenClient!.name();
      let res = await tx.simulate();
      expect(res.result).toBe(testContext!.asset);
    });

    it("Can mint", async () => {
      let tx = await sacTokenClient!.balance({ id: alice.publicKey() });
      let balance = (await tx.simulate()).result;

      let mintTx = await sacTokenClient!.mint(
        {
          to: alice.publicKey(),
          amount: BigInt(123),
        },
        { fee: 100000000 },
      );
      console.log(mintTx.needsNonInvokerSigningBy());
      console.log(mintTx.toXDR());

      await mintTx.signAuthEntries({
        publicKey: regularSacIssuer.publicKey(),
        signAuthEntry: signer(regularSacIssuer).signAuthEntry,
      });
      console.log(mintTx.needsNonInvokerSigningBy());

      // TODO: [js-sdk] this piece of code was previously not working due to resource fees, see https://discord.com/channels/897514728459468821/1247601679239614618/1247601679239614618
      // TODO: [js-sdk] this should be easily changeable within the SDK. Note that options.fee doesn't change resourceFee
      // mintTx.raw = TransactionBuilder.cloneFrom(mintTx.built!, {
      //   fee: mintTx.built!.fee,
      //   sorobanData: new SorobanDataBuilder(
      //     mintTx.simulationData.transactionData.toXDR(),
      //   )
      //     .setResourceFee(BigInt(10000000))
      //     .build(),
      // });
      await mintTx.simulate();
      await mintTx.sign({
        signTransaction: signer(submitter).signTransaction,
      });
      console.log(mintTx.toXDR());

      let result = await mintTx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Mint transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );

      let newBalance = (await tx.simulate()).result;

      expect(newBalance).toBe(balance + BigInt(123));
      let aliceAccount = await horizon
        .accounts()
        .accountId(alice.publicKey())
        .call();
      let classicBalance = aliceAccount.balances
        .filter((x) => x.asset_type == "credit_alphanum12")
        .find(
          (x) =>
            (x as BalanceLineAsset).asset_code ==
            testContext!.asset.split(":")[0],
        )?.balance;
      expect(classicBalance).toBeDefined();
      expect(parseFloat(classicBalance!)).toBe(Number(newBalance) / 10000000);
    });
  });

  describe("Wrapped SAC test", () => {
    beforeEach(() => {
      expect(wrappedTokenClient).toBeDefined();
      expect(testContext).toBeDefined();
      expect(testContext!.state).toBe(TestState.controller_initialized);
    });

    it("Can get the name", async () => {
      let tx = await wrappedTokenClient!.name();
      let res = await tx.simulate();
      expect(res.result).toBe(testContext!.asset_wrapped);
    });

    it("Can mint", async () => {
      let tx = await wrappedTokenClient!.balance({ id: alice.publicKey() });
      let balance = (await tx.simulate()).result;

      let mintTx = await wrappedTokenClient!.mint(
        {
          to: alice.publicKey(),
          amount: BigInt(12345),
        },
        { fee: 100000000 },
      );
      console.log(mintTx.needsNonInvokerSigningBy());
      console.log(mintTx.toXDR());

      await mintTx.signAuthEntries({
        publicKey: admin.publicKey(),
        signAuthEntry: signer(admin).signAuthEntry,
      });
      console.log(mintTx.needsNonInvokerSigningBy());

      await mintTx.simulate();
      await mintTx.sign({
        signTransaction: signer(submitter).signTransaction,
      });
      console.log(mintTx.toXDR());

      let result = await mintTx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Mint transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );

      let newBalance = (await tx.simulate()).result;

      expect(newBalance).toBe(balance + BigInt(12345));
      let aliceAccount = await horizon
        .accounts()
        .accountId(alice.publicKey())
        .call();
      let classicBalance = aliceAccount.balances
        .filter((x) => x.asset_type == "credit_alphanum12")
        .find(
          (x) =>
            (x as BalanceLineAsset).asset_code ==
            testContext!.asset_wrapped.split(":")[0],
        )?.balance;
      expect(classicBalance).toBeDefined();
      expect(parseFloat(classicBalance!)).toBe(Number(newBalance) / 10000000);
    });

    it("Can transfer Alice -> Bob", async () => {
      let balanceTx = await wrappedTokenClient!.balance({
        id: alice.publicKey(),
      });
      let balance = (await balanceTx.simulate()).result;
      let balanceTxBob = await wrappedTokenClient!.balance({
        id: bob.publicKey(),
      });
      let balanceBob = (await balanceTxBob.simulate()).result;

      let transferTx = await wrappedTokenClient!.transfer(
        {
          from: alice.publicKey(),
          to: bob.publicKey(),
          amount: BigInt(3),
        },
        { fee: 100000000 },
      );
      console.log(transferTx.needsNonInvokerSigningBy());
      console.log(transferTx.toXDR());

      await transferTx.signAuthEntries({
        publicKey: alice.publicKey(),
        signAuthEntry: signer(alice).signAuthEntry,
      });
      console.log(transferTx.needsNonInvokerSigningBy());

      await transferTx.simulate();
      await transferTx.sign({
        signTransaction: signer(submitter).signTransaction,
      });
      console.log(transferTx.toXDR());

      let result = await transferTx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Transfer transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );

      let newBalance = (await balanceTx.simulate()).result;
      let newBalanceBob = (await balanceTxBob.simulate()).result;

      expect(newBalance).toBe(balance - BigInt(3));
      expect(newBalanceBob).toBe(balanceBob + BigInt(3));
    });

    it("Can delegate transfer", async () => {
      let balanceTx = await wrappedTokenClient!.balance({
        id: alice.publicKey(),
      });
      let balance = (await balanceTx.simulate()).result;
      let balanceTxBob = await wrappedTokenClient!.balance({
        id: bob.publicKey(),
      });
      let balanceBob = (await balanceTxBob.simulate()).result;

      let transferTx = await swapClient!.delegate_transfer(
        {
          asset: testContext!.wrapper,
          from: alice.publicKey(),
          to: bob.publicKey(),
          amount: BigInt(2),
        },
        { fee: 100000000 },
      );
      console.log(transferTx.needsNonInvokerSigningBy());
      console.log(transferTx.toXDR());

      await transferTx.signAuthEntries({
        publicKey: alice.publicKey(),
        signAuthEntry: signer(alice).signAuthEntry,
      });
      console.log(transferTx.needsNonInvokerSigningBy());

      await transferTx.simulate();
      await transferTx.sign({
        signTransaction: signer(submitter).signTransaction,
      });
      console.log(transferTx.toXDR());

      let result = await transferTx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Transfer transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );

      let newBalance = (await balanceTx.simulate()).result;
      let newBalanceBob = (await balanceTxBob.simulate()).result;

      expect(newBalance).toBe(balance - BigInt(2));
      expect(newBalanceBob).toBe(balanceBob + BigInt(2));
    });

    it("Can swap", async () => {
      let balanceTxSAC = await sacTokenClient!.balance({
        id: alice.publicKey(),
      });
      let balanceSAC = (await balanceTxSAC.simulate()).result;
      let balanceTxBobSAC = await sacTokenClient!.balance({
        id: bob.publicKey(),
      });
      let balanceBobSAC = (await balanceTxBobSAC.simulate()).result;

      let balanceTxWrapped = await wrappedTokenClient!.balance({
        id: alice.publicKey(),
      });
      let balanceWrapped = (await balanceTxWrapped.simulate()).result;
      let balanceTxBobWrapped = await wrappedTokenClient!.balance({
        id: bob.publicKey(),
      });
      let balanceBobWrapped = (await balanceTxBobWrapped.simulate()).result;

      let swapTx = await swapClient!.simple_swap(
        {
          from: alice.publicKey(),
          to: bob.publicKey(),
          token_from: testContext!.sac,
          token_to: testContext!.wrapper,
          amount: BigInt(5),
        },
        { fee: 100000000 },
      );
      console.log(swapTx.needsNonInvokerSigningBy());
      console.log(swapTx.toXDR());

      await swapTx.signAuthEntries({
        publicKey: alice.publicKey(),
        signAuthEntry: signer(alice).signAuthEntry,
      });
      console.log(swapTx.needsNonInvokerSigningBy());
      await swapTx.signAuthEntries({
        publicKey: bob.publicKey(),
        signAuthEntry: signer(bob).signAuthEntry,
      });
      console.log(swapTx.needsNonInvokerSigningBy());

      await swapTx.simulate();
      await swapTx.sign({
        signTransaction: signer(submitter).signTransaction,
      });
      console.log(swapTx.toXDR());

      let result = await swapTx.send();
      let hash = result.sendTransactionResponse?.hash;
      console.log("Transfer transaction hash: " + hash);
      expect(hash).toBeDefined();
      expect(result.getTransactionResponse?.status).toBe(
        rpc.Api.GetTransactionStatus.SUCCESS,
      );

      let newBalanceSAC = (await balanceTxSAC.simulate()).result;
      let newBalanceBobSAC = (await balanceTxBobSAC.simulate()).result;
      let newBalanceWrapped = (await balanceTxWrapped.simulate()).result;
      let newBalanceBobWrapped = (await balanceTxBobWrapped.simulate()).result;

      expect(newBalanceSAC).toBe(balanceSAC - BigInt(5));
      expect(newBalanceBobSAC).toBe(balanceBobSAC + BigInt(5));

      expect(newBalanceWrapped).toBe(balanceWrapped + BigInt(5));
      expect(newBalanceBobWrapped).toBe(balanceBobWrapped - BigInt(5));
    });
  });
});

function makeTokenClient(contractId: string, key: Keypair) {
  return new TokenClient({
    publicKey: key.publicKey(),
    networkPassphrase: network,
    rpcUrl: rpcUrl,
    contractId: contractId,
  });
}

function signer(kp: Keypair) {
  return contract.basicNodeSigner(kp, network);
}

function readContext(): TestContext | null {
  if (!fs.existsSync(".test_data.json")) {
    return null;
  }
  let file = fs.readFileSync(".test_data.json", "utf-8");
  if (file) {
    return JSON.parse(file);
  }
  return null;
}

function writeContext(context: TestContext) {
  fs.writeFileSync(".test_data.json", JSON.stringify(context));
}

type TestContext = {
  asset: string;
  sac: string;
  asset_wrapped: string;
  sac_wrapped: string;
  wrapper: string;
  controller: string;
  swap_contract: string;
  state: TestState;
};

enum TestState {
  deployed = 0,
  wrapper_initialized = 1,
  wrapper_admin_changed = 2,
  controller_initialized = 3,
}
