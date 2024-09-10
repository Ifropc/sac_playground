import type { i128 } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
export declare const networks: {
  readonly testnet: {
    readonly networkPassphrase: "Test SDF Network ; September 2015";
    readonly contractId: "CDBHK7MDCLLOY5IWKPARS6KWX2M4REGE2UA2LAM7BZFPH3HDF6LWWP33";
  };
};
export declare const Errors: {};
export interface SwapClient {
  /**
   * Construct and simulate a delegate_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  delegate_transfer: ({ asset, from, to, amount }: {
    asset: string;
    from: string;
    to: string;
    amount: i128;
  }, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;
    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;
    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>;
  /**
   * Construct and simulate a simple_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  simple_swap: ({ from, to, token_from, token_to, sac, amount }: {
    from: string;
    to: string;
    token_from: string;
    token_to: string;
    sac: string;
    amount: i128;
  }, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;
    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;
    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>;
}
export class SwapClient extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
        new ContractSpec(["AAAAAAAAAAAAAAARZGVsZWdhdGVfdHJhbnNmZXIAAAAAAAAEAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
          "AAAAAAAAAAAAAAALc2ltcGxlX3N3YXAAAAAABgAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAp0b2tlbl9mcm9tAAAAAAATAAAAAAAAAAh0b2tlbl90bwAAABMAAAAAAAAAA3NhYwAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA"]),
        options
    )
  }
  public readonly fromJSON = {
    delegate_transfer: this.txFromJSON<null>,
    simple_swap: this.txFromJSON<null>
  }
}
