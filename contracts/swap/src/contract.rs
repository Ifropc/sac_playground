use soroban_sdk::{Address, contract, contractimpl, Env, IntoVal, token};

pub trait SwapTrait {
    fn delegate_transfer(e: Env, asset: Address, from: Address, to: Address, amount: i128);

    fn simple_swap(e: Env, from: Address, to: Address, token_from: Address, token_to: Address, amount: i128);
}

#[contract]
pub struct SwapContract;

#[contractimpl]
impl SwapTrait for SwapContract {
    fn delegate_transfer(e: Env, asset: Address, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let asset_client = token::Client::new(&e, &asset);
        asset_client.transfer(&from, &to, &amount);
    }

    fn simple_swap(e: Env, from: Address, to: Address, token_from: Address, token_to: Address, amount: i128) {
        from.require_auth_for_args(
            (token_from.clone(), token_to.clone(), amount).into_val(&e),
        );
        to.require_auth_for_args(
            (token_to.clone(), token_from.clone(), amount).into_val(&e),
        );

        let contract_address = e.current_contract_address();

        let token_from = token::Client::new(&e, &token_from);
        let token_to = token::Client::new(&e, &token_to);

        token_from.transfer(&from, &to, &amount);
        token_to.transfer(&to, &from, &amount);

        // token_from.transfer(&from, &contract_address, &amount);
        // token_from.transfer(&contract_address, &to, &amount);
        //
        // token_to.transfer(&to, &contract_address, &amount);
        // token_to.transfer(&contract_address, &from, &amount);
    }
}