import { Keypair, rpc } from "@stellar/stellar-sdk";
import { beforeAll, describe, it } from "@jest/globals";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

export * as rpc from "@stellar/stellar-sdk/rpc";
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);

describe("Integration tests for wrapped Stellar Asset Contract", () => {
  const network = "Test SDF Network ; September 2015";
  const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org");
  dotenv.config();
  let command = "stellar";
  // GBIJQTM4JZXO6LASTSY3IWQCFPUDLDGTQ6PAFBAZLG2RLZIXTHBNVMU6
  let admin = Keypair.fromSecret(
    "SBVZEKCUCGYOFEK7IVDECV2KVFAOR3MYS4BLSWSRHT2J6PHBXBSRZCZF",
  );

  beforeAll(() => {
    if (process.env.STELLAR_CLI_PATH) {
      command = process.env.STELLAR_CLI_PATH;
    }
    if (process.env.STELLAR_KEY) {
      admin = Keypair.fromSecret(process.env.STELLAR_KEY);
    }
    console.log("Using admin key " + admin.publicKey());
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
          admin.secret() +
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
      let cache = readContext();

      if (cache && cache.sac) {
        console.log("Loaded contract from cache " + cache.sac);
        return;
      }

      let ticker = (Math.random() * 1337)
        .toString(36)
        .replaceAll(/[0-9]|\./g, "")
        .toUpperCase();
      expect(ticker.length).toBeGreaterThan(2);
      expect(ticker.length).toBeLessThanOrEqual(12);
      console.log("Deploying test asset " + ticker);
      let asset = ticker + ":" + admin.publicKey();
      const { stdout, stderr } = await exec(
        command +
          " contract asset deploy --asset " +
          asset +
          " --source-account e2e-test-key --network testnet",
      );
      expect(stderr).toBe("");
      const contract = stdout;
      console.log("Deployed contract " + contract);
      writeContext({
        asset: asset,
        sac: contract,
      });
    });

    it("Has contract id", async () => {
      expect(readContext()?.asset).toBeDefined();
    });
  });
});

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
