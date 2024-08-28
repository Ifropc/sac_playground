use soroban_sdk::{Address, contract, contractimpl, Env, token};

pub trait SwapTrait {
    fn delegate_transfer(e: Env, asset: Address, from: Address, to: Address, amount: i128);
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
}