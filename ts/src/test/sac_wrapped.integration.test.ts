import {
  Asset,
  contract,
  Horizon,
  Keypair,
  Operation,
  rpc,
  SorobanDataBuilder,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { beforeAll, beforeEach, describe, it } from "@jest/globals";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

import * as process from "node:process";
import { TokenClient } from "../bindings/token";
import { WrappedClient } from "../bindings/wrapped_client";
import { TokenControllerClient } from "../bindings/controller";
import BalanceLineAsset = Horizon.HorizonApi.BalanceLineAsset;

export * as rpc from "@stellar/stellar-sdk/rpc";
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);
const network = "Test SDF Network ; September 2015";
const rpcUrl = "https://soroban-testnet.stellar.org";
const rpcServer = new rpc.Server(rpcUrl);
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
// GCXDFJ7AZGIVCUKFOYNJ57I2RRBSWG2RNV3FKPVHYZXL3PXVTVTIR6KZ
const alice = Keypair.fromSecret(
  "SB3U4SFHDLTN3CJ2WWMDHD64TOV55TDVAJD2KXA3LRK6H5EWYUFS6BTP",
);
// GAHK5N2WYMCMI5CACR4XHU6MKKADVVD7PCDULWSVRCVGFQXO7BVRLZGR
const bob = Keypair.fromSecret(
  "SCTBD2AHMQ22JWK4RBJR5SUGSI4UIFQS5GYTE3B42ALBPATQM4C5BIS3",
);
// GCVTWAFW5XK5IEMVN25FCZDNYSY6HRRMAARGD2Z63Q2YHXPFAGRWRR63
const submitter = Keypair.fromSecret(
  "SAGWTKL4QMP24C56JVXIVOZ232QDUXTJ6DXDEVT4BIBCLJTOL3SB4NKJ",
);

describe("Integration tests for wrapped Stellar Asset Contract", () => {
  dotenv.config();
  let command = "stellar";
  // GBIJQTM4JZXO6LASTSY3IWQCFPUDLDGTQ6PAFBAZLG2RLZIXTHBNVMU6
  let issuer = Keypair.fromSecret(
    "SBVZEKCUCGYOFEK7IVDECV2KVFAOR3MYS4BLSWSRHT2J6PHBXBSRZCZF",
  );
  // GB2MTO72T7DNJAY5O2VA6WBLGRT7NP2D2N42SA656VINUH3KXBLPTXGR
  let admin = Keypair.fromSecret(
    "SBLNCXNZNMNNVCSHKJJCUN6ZE4YJPXNTP7IJUZVVPRNL7NTZD3WC5O2K",
  );
  let sacTokenClient: TokenClient | null;
  let wrappedTokenClient: TokenClient | null;
  let underlyingSACTokenClient: TokenClient | null;
  let wrappedFunctionClient: WrappedClient | null;
  let controllerClient: TokenControllerClient | null;
  let testContext: TestContext | null;

  beforeAll(() => {
    if (process.env.STELLAR_CLI_PATH) {
      command = process.env.STELLAR_CLI_PATH;
    }
    if (process.env.ISSUER_KEY) {
      issuer = Keypair.fromSecret(process.env.ISSUER_KEY);
    }
    console.log("Using issuer key " + issuer.publicKey());
  });

  beforeEach(() => {
    testContext = readContext();
    if (testContext?.sac) {
      function makeTokenClient(contractId: string) {
        return new TokenClient({
          publicKey: submitter.publicKey(),
          networkPassphrase: network,
          rpcUrl: rpcUrl,
          contractId: contractId,
        });
      }

      sacTokenClient = makeTokenClient(testContext.sac);
      wrappedTokenClient = makeTokenClient(testContext.wrapper);
      underlyingSACTokenClient = makeTokenClient(testContext.sac_wrapped);
      wrappedFunctionClient = new WrappedClient({
        publicKey: issuer.publicKey(),
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
          issuer.secret() +
          " " +
          command +
          " keys add e2e-test-key --secret-key",
      );
      await exec(
        "SOROBAN_SECRET_KEY=" +
          admin.secret() +
          " " +
          command +
          " keys add e2e-admin --secret-key",
      );
      let { stdout3 } = await exec(command + " keys ls");
      expect(stdout3).toContain("e2e-admin");
      expect(stdout3).toContain("e2e-test-key");
    });
    console.log("CLI OK");
  });

  describe("Test setup", () => {
    it("Should create SAC", async () => {
      if (testContext && testContext.sac) {
        console.log("Loaded contract from cache " + testContext.sac);
        return;
      }

      async function deploySAC() {
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
            " --source-account e2e-test-key --network testnet",
        );
        expect(stderr).toBe("");
        const contract: string = stdout.trim();
        console.log("Deployed contract " + contract);

        return { contract, ticker };
      }

      async function addTrustline(ticker: string, kp: Keypair) {
        let aliceAccount = await rpcServer.getAccount(kp.publicKey());

        let aliceTrust = new TransactionBuilder(aliceAccount, {
          fee: "1000",
          timebounds: { minTime: 0, maxTime: 0 },
          networkPassphrase: network,
        })
          .addOperation(
            Operation.changeTrust({
              asset: new Asset(ticker, issuer.publicKey()),
            }),
          )
          .build();
        aliceTrust.sign(kp);
        const result = await rpcServer.sendTransaction(aliceTrust);
        const hash = result.hash;
        console.log("Sent trustline transaction: " + hash);
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
        console.log("Trustline set for " + kp.publicKey());
      }

      async function deploy_contract(contract_name: string) {
        const { stdout, stderr } = await exec(
          command +
            " contract deploy --source-account e2e-test-key --network testnet --wasm target/wasm32-unknown-unknown/release/" +
            contract_name +
            ".wasm",
        );
        expect(stderr).toBe("");
        const output: string = stdout;
        const contract = output.split("Deployed!")[1].trim();
        console.log("Deployed " + contract_name + ": " + contract);
        return contract;
      }

      let sac = await deploySAC();
      let sac_wrapped = await deploySAC();

      await addTrustline(sac.ticker, alice);
      await addTrustline(sac.ticker, bob);
      await addTrustline(sac_wrapped.ticker, alice);
      await addTrustline(sac_wrapped.ticker, bob);

      let wrapper = await deploy_contract("enforced_classic_asset_wrapper");
      let controller = await deploy_contract("regulated_token_controller");

      writeContext({
        asset: sac.ticker + ":" + issuer.publicKey(),
        sac: sac.contract,
        asset_wrapped: sac_wrapped.ticker + ":" + issuer.publicKey(),
        sac_wrapped: sac_wrapped.contract,
        wrapper: wrapper,
        controller: controller,
        state: TestState.deployed,
      });
    });

    it("Has contract id", async () => {
      expect(testContext?.asset).toBeDefined();
    });

    it("Should initialize wrapped contract", async () => {
      expect(wrappedFunctionClient).toBeDefined();
      if (testContext!.state >= TestState.wrapper_initialized) {
        console.log("Wrapped already initialized");
        return;
      }

      console.log(testContext!.sac_wrapped + " " + testContext!.controller);

      let tx = await wrappedFunctionClient!.initialize({
        admin: admin.publicKey(),
        asset: testContext!.sac_wrapped,
        asset_controller: testContext!.controller,
      });

      // TODO: this doesn't match cli output
      // console.log(tx.toXDR())
      // const res = await tx.simulate()

      const { stdout, stderr } = await exec(
        command +
          // TODO: run with different account (e2e-admin)
          " contract invoke --network testnet --source-account e2e-test-key --id " +
          testContext!.wrapper +
          " -- initialize " +
          " --admin " +
          // TODO: not working with different admin (why?)
          issuer.publicKey() +
          " --asset " +
          testContext!.sac_wrapped +
          " --asset_controller " +
          testContext!.controller,
      );
      // TODO: not working with e2e-admin key

      // const xdr: string = stdout;
      //
      // tx = wrappedFunctionClient!.txFromXDR(xdr.trim())

      // await tx.signAuthEntries({
      //   publicKey: issuer.publicKey(),
      //   signAuthEntry: signer(issuer).signAuthEntry
      // })

      // await tx.simulate()
      // await tx.sign({
      //   signTransaction: signer(issuer).signTransaction
      // })
      //
      // let result = await tx.send();
      // let hash = result.sendTransactionResponse?.hash;
      // console.log("Init wrapped contract transaction hash: " + hash);
      // expect(hash).toBeDefined();
      // expect(result.getTransactionResponse?.status).toBe(
      //     rpc.Api.GetTransactionStatus.SUCCESS,
      // );

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
          " --network testnet --source-account e2e-test-key -- set_admin --new_admin " +
          admin.publicKey(),
      );

      const { stdout, stderr } = await exec(
        command +
          " contract invoke --id " +
          testContext!.wrapper +
          " --network testnet --source-account e2e-test-key -- get_admin",
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
          " --network testnet --source-account e2e-admin -- initialize --admin " +
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
        publicKey: issuer.publicKey(),
        signAuthEntry: signer(issuer).signAuthEntry,
      });
      console.log(mintTx.needsNonInvokerSigningBy());

      // TODO: ???
      mintTx.raw = TransactionBuilder.cloneFrom(mintTx.built!, {
        fee: mintTx.built!.fee,
        sorobanData: new SorobanDataBuilder(
          tx.simulationData.transactionData.toXDR(),
        )
          .setResourceFee(BigInt(10000000))
          .build(),
      });
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
      expect(classicBalance).toBe((Number(newBalance) / 10000000).toString());
    });
  });
});

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
  state: TestState;
};

enum TestState {
  deployed = 0,
  wrapper_initialized = 1,
  wrapper_admin_changed = 2,
  controller_initialized = 3,
}
