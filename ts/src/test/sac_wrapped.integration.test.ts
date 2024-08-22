import {
  Asset,
  contract,
  Horizon,
  Keypair,
  Operation,
  rpc,
  SorobanDataBuilder,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { beforeAll, beforeEach, describe, it } from "@jest/globals";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

import * as process from "node:process";
import { TokenClient } from "../bindings/token";
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
  let tokenClient: TokenClient | null;
  let testContext: TestContext | null;

  beforeAll(() => {
    if (process.env.STELLAR_CLI_PATH) {
      command = process.env.STELLAR_CLI_PATH;
    }
    if (process.env.ISSUER_KEY) {
      issuer = Keypair.fromSecret(process.env.ISSUER_KEY);
    }
    console.log("Using admin key " + issuer.publicKey());
  });

  beforeEach(() => {
    testContext = readContext();
    if (testContext?.sac) {
      tokenClient = new TokenClient({
        publicKey: submitter.publicKey(),
        networkPassphrase: network,
        rpcUrl: rpcUrl,
        contractId: testContext.sac,
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
      let { stdout, stderr } = await exec(
        "SOROBAN_SECRET_KEY=" +
          issuer.secret() +
          " " +
          command +
          " keys add e2e-test-key --secret-key",
      );
      expect(stderr).toBe("");
    });
    console.log("CLI OK");
  });

  describe("Test setup", () => {
    it("Should create SAC", async () => {
      if (testContext && testContext.sac) {
        console.log("Loaded contract from cache " + testContext.sac);
        return;
      }

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
      const contract: string = stdout;
      console.log("Deployed contract " + contract);

      async function addTrustline(kp: Keypair) {
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

      await addTrustline(alice);
      await addTrustline(bob);

      writeContext({
        asset: asset,
        sac: contract.trim(),
      });
    });

    it("Has contract id", async () => {
      expect(testContext?.asset).toBeDefined();
    });
  });

  describe("Regular SAC test", () => {
    beforeEach(() => {
      expect(tokenClient).toBeDefined();
      expect(testContext).toBeDefined();
    });

    it("Can get the name", async () => {
      let tx = await tokenClient!.name();
      let res = await tx.simulate();
      expect(res.result).toBe(testContext!.asset);
    });

    it("Can mint", async () => {
      let tx = await tokenClient!.balance({ id: alice.publicKey() });
      let balance = (await tx.simulate()).result;

      let mintTx = await tokenClient!.mint(
        {
          to: alice.publicKey(),
          amount: BigInt(123),
        },
        { fee: 100000000 },
      );
      console.log(mintTx.needsNonInvokerSigningBy());

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

function writeContext(cache: TestContext) {
  fs.writeFileSync(".test_data.json", JSON.stringify(cache));
}

type TestContext = {
  asset: string;
  sac: string;
};
