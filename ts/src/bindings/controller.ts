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
    contractId: "CBDZWUK352DDUTG42EEUXG4FTXZBX3VFLKPWWYH3U233X3UU5IQVRDQD",
  }
} as const


export interface AllowanceValue {
  amount: i128;
  expiration_ledger: u32;
}


export interface AccountActivityData {
  inflow: Array<TxEntry>;
  outflow: Array<TxEntry>;
}


export interface TxEntry {
  amount: i128;
  timestamp: u64;
}


export interface AccountQuotaReleaseData {
  inflow: Array<TxReleaseEntry>;
  outflow: Array<TxReleaseEntry>;
}


export interface TxReleaseEntry {
  amount: i128;
  time_left: u64;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Asset", values: void} | {tag: "AccountActivity", values: readonly [string]} | {tag: "OutflowLimit", values: void} | {tag: "InflowLimit", values: void} | {tag: "QuotaTimeLimit", values: void} | {tag: "ProbationPeriod", values: void} | {tag: "AccountProbationStart", values: readonly [string]};

export const Errors = {

}

export interface TokenControllerClient {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, asset, probation_period, quota_time_limit, inflow_limit, outflow_limit}: {admin: string, asset: string, probation_period: u64, quota_time_limit: u64, inflow_limit: i128, outflow_limit: i128}, options?: {
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
   * Construct and simulate a set_probation_start transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_probation_start: ({id, probation_start, reset_quotas}: {id: string, probation_start: u64, reset_quotas: boolean}, options?: {
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
   * Construct and simulate a review_transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  review_transfer: ({from, to, amount}: {from: string, to: string, amount: i128}, options?: {
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
   * Construct and simulate a get_quota transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_quota: ({id}: {id: string}, options?: {
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
  }) => Promise<AssembledTransaction<Array<i128>>>

  /**
   * Construct and simulate a get_account_probation_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_account_probation_period: ({id}: {id: string}, options?: {
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
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_quota_release_time transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_quota_release_time: ({id}: {id: string}, options?: {
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
  }) => Promise<AssembledTransaction<AccountQuotaReleaseData>>

  /**
   * Construct and simulate a get_probation_period transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_probation_period: (options?: {
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
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_quota_time_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_quota_time_limit: (options?: {
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
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_inflow_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_inflow_limit: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_outflow_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_outflow_limit: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_asset transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_asset: (options?: {
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
  }) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: {
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
  }) => Promise<AssembledTransaction<string>>

}
export class TokenControllerClient extends ContractClient {
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAVhc3NldAAAAAAAABMAAAAAAAAAEHByb2JhdGlvbl9wZXJpb2QAAAAGAAAAAAAAABBxdW90YV90aW1lX2xpbWl0AAAABgAAAAAAAAAMaW5mbG93X2xpbWl0AAAACwAAAAAAAAANb3V0Zmxvd19saW1pdAAAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAATc2V0X3Byb2JhdGlvbl9zdGFydAAAAAADAAAAAAAAAAJpZAAAAAAAEwAAAAAAAAAPcHJvYmF0aW9uX3N0YXJ0AAAAAAYAAAAAAAAADHJlc2V0X3F1b3RhcwAAAAEAAAAA",
        "AAAAAAAAAAAAAAAPcmV2aWV3X3RyYW5zZmVyAAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X3F1b3RhAAAAAAAAAQAAAAAAAAACaWQAAAAAABMAAAABAAAD6gAAAAs=",
        "AAAAAAAAAAAAAAAcZ2V0X2FjY291bnRfcHJvYmF0aW9uX3BlcmlvZAAAAAEAAAAAAAAAAmlkAAAAAAATAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAAWZ2V0X3F1b3RhX3JlbGVhc2VfdGltZQAAAAAAAQAAAAAAAAACaWQAAAAAABMAAAABAAAH0AAAABdBY2NvdW50UXVvdGFSZWxlYXNlRGF0YQA=",
        "AAAAAAAAAAAAAAAUZ2V0X3Byb2JhdGlvbl9wZXJpb2QAAAAAAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAAUZ2V0X3F1b3RhX3RpbWVfbGltaXQAAAAAAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAAQZ2V0X2luZmxvd19saW1pdAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAARZ2V0X291dGZsb3dfbGltaXQAAAAAAAAAAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAJZ2V0X2Fzc2V0AAAAAAAAAAAAAAEAAAAT",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAAAQAAAAAAAAAAAAAADkFsbG93YW5jZVZhbHVlAAAAAAACAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAE0FjY291bnRBY3Rpdml0eURhdGEAAAAAAgAAAAAAAAAGaW5mbG93AAAAAAPqAAAH0AAAAAdUeEVudHJ5AAAAAAAAAAAHb3V0ZmxvdwAAAAPqAAAH0AAAAAdUeEVudHJ5AA==",
        "AAAAAQAAAAAAAAAAAAAAB1R4RW50cnkAAAAAAgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAAF0FjY291bnRRdW90YVJlbGVhc2VEYXRhAAAAAAIAAAAAAAAABmluZmxvdwAAAAAD6gAAB9AAAAAOVHhSZWxlYXNlRW50cnkAAAAAAAAAAAAHb3V0ZmxvdwAAAAPqAAAH0AAAAA5UeFJlbGVhc2VFbnRyeQAA",
        "AAAAAQAAAAAAAAAAAAAADlR4UmVsZWFzZUVudHJ5AAAAAAACAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACXRpbWVfbGVmdAAAAAAAAAY=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAFQXNzZXQAAAAAAAABAAAAAAAAAA9BY2NvdW50QWN0aXZpdHkAAAAAAQAAABMAAAAAAAAAAAAAAAxPdXRmbG93TGltaXQAAAAAAAAAAAAAAAtJbmZsb3dMaW1pdAAAAAAAAAAAAAAAAA5RdW90YVRpbWVMaW1pdAAAAAAAAAAAAAAAAAAPUHJvYmF0aW9uUGVyaW9kAAAAAAEAAAAAAAAAFUFjY291bnRQcm9iYXRpb25TdGFydAAAAAAAAAEAAAAT" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        set_probation_start: this.txFromJSON<null>,
        review_transfer: this.txFromJSON<null>,
        get_quota: this.txFromJSON<Array<i128>>,
        get_account_probation_period: this.txFromJSON<u64>,
        get_quota_release_time: this.txFromJSON<AccountQuotaReleaseData>,
        get_probation_period: this.txFromJSON<u64>,
        get_quota_time_limit: this.txFromJSON<u64>,
        get_inflow_limit: this.txFromJSON<i128>,
        get_outflow_limit: this.txFromJSON<i128>,
        get_asset: this.txFromJSON<string>,
        get_admin: this.txFromJSON<string>
  }
}