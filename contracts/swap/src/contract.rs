use soroban_sdk::{Address, contract, contractimpl, Env, IntoVal, Symbol, token, vec};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};

pub trait SwapTrait {
    fn delegate_transfer(e: Env, asset: Address, from: Address, to: Address, amount: i128);

    fn simple_swap(e: Env, from: Address, to: Address, token_from: Address, token_to: Address, sac: Address, amount: i128);
}

#[contract]
pub struct SwapContract;

mod wrapper {
    soroban_sdk::contractimport!(file = "../../target/wasm32-unknown-unknown/release/enforced_classic_asset_wrapper.wasm");
}

#[contractimpl]
impl SwapTrait for SwapContract {
    fn delegate_transfer(e: Env, asset: Address, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let asset_client = token::Client::new(&e, &asset);
        asset_client.transfer(&from, &to, &amount);
    }

    fn simple_swap(env: Env, from: Address, to: Address, token_regular: Address, wrapper: Address, sac_wrapped: Address, amount: i128) {
        from.require_auth();
        to.require_auth();

        // let wrapper = wrapper::Client::new(&env, &token_to);
        // let sac = wrapper.get_metadata().asset;

        let contract_address = env.current_contract_address();

        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: sac_wrapped,
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), from.clone(), amount,).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_regular = token::Client::new(&env, &token_regular);
        let token_wrapped = token::Client::new(&env, &wrapper);

        token_regular.transfer(&from, &contract_address, &amount);
        token_regular.transfer(&contract_address, &to, &amount);

        token_wrapped.transfer(&to, &contract_address, &amount);
        token_wrapped.transfer(&contract_address, &from, &amount);
    }
}