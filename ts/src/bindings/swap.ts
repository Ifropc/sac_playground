import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CC4LYSQTRZS7J2P2GYGAVTFG2QIPIPVGDPBLQGJ3UBC74K527U4RBGQW",
  }
} as const

export const Errors = {

}

export interface SwapClient {
  /**
   * Construct and simulate a delegate_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  delegate_transfer: ({asset, from, to, amount}: {asset: string, from: string, to: string, amount: i128}, options?: {
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
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a simple_swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  simple_swap: ({from, to, token_from, token_to, amount}: {from: string, to: string, token_from: string, token_to: string, amount: i128}, options?: {
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
  }) => Promise<AssembledTransaction<null>>

}
export class SwapClient extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
        new ContractSpec([ "AAAAAAAAAAAAAAARZGVsZWdhdGVfdHJhbnNmZXIAAAAAAAAEAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
          "AAAAAAAAAAAAAAALc2ltcGxlX3N3YXAAAAAABQAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAp0b2tlbl9mcm9tAAAAAAATAAAAAAAAAAh0b2tlbl90bwAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=" ]),
        options
    )
  }
  public readonly fromJSON = {
    delegate_transfer: this.txFromJSON<null>,
    simple_swap: this.txFromJSON<null>
  }
}