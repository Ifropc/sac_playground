use crate::account_authorization::{
    execute_with_temporary_authorizations, set_account_authorization,
};
use crate::admin::set_asset_admin;
use crate::asset_controller::review_transfer;
use crate::validations::{
    is_admin_validation, is_contract_initialized_validation,
    is_contract_not_initialized_validation, is_wrapper_active_validation,
};
use soroban_sdk::{contract, contractimpl, token, vec, Address, Env, String, IntoVal, Symbol};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::token::TokenInterface;
use standard_traits::classic_wrapper::common::{
    read_admin, read_asset, read_metadata, write_admin, write_is_active, write_metadata,
    WrapperMetadata,
};
use standard_traits::classic_wrapper::enforced::EnforcedClassicWrapperInterfaceTrait;

pub trait SpecifcFeaturesTrait {
    //
    // Important: Different from the pure soroban regulated asset,
    // when initializing the asset controller for this asset, it is
    // necessary to set the asset contract as this wrapper's address
    // instead of the stellar asset contract. This is necessary because
    // the asset controller validates who is the contract invoking it
    // before allowing the functions to be executed and for the classic
    // asset, the wrapper will perform these invokations.
    //

    // --------------------------------------------------------------------------------
    // Admin interface – privileged functions.
    // --------------------------------------------------------------------------------
    //
    // All the admin functions have to be authorized by the admin with all input
    // arguments, i.e. they have to call `admin.require_auth()`.

    // Inititalize Parameters
    //-------------------------
    // admin:            Address that has managing rights over the contract
    // asset:            Address of the classic asset contract
    // asset_controller: Address of the Asset controller contract
    //
    fn initialize(e: Env, admin: Address, asset: Address, asset_controller: Address);

    // Mint an arbitrary amount of asset units directly to
    // the 'to' address.
    fn mint(e: Env, to: Address, amount: i128);

    fn mint_flatten(e: Env, to: Address, amount: i128);
}

#[contract]
pub struct WrapperInterface;

#[contractimpl]
impl EnforcedClassicWrapperInterfaceTrait for WrapperInterface {
    fn activate_wrapper(e: Env) {
        is_admin_validation(&e);
        set_asset_admin(&e, &e.current_contract_address());

        write_is_active(&e, true);
    }

    fn deactivate_wrapper(e: Env) {
        is_admin_validation(&e);
        let admin = read_admin(&e);
        set_asset_admin(&e, &admin);

        write_is_active(&e, false);
    }

    fn set_admin(e: Env, new_admin: Address) {
        is_admin_validation(&e);

        write_admin(&e, new_admin)
    }

    fn set_authorized(e: Env, id: Address, authorize: bool) {
        is_admin_validation(&e);
        set_account_authorization(&e, id, authorize);
    }

    // --------------------------------------------------------------------------------
    // Read-only
    // --------------------------------------------------------------------------------
    fn get_metadata(e: Env) -> WrapperMetadata {
        is_contract_initialized_validation(&e);
        read_metadata(&e)
    }

    fn is_wrapper_active(e: Env) -> bool {
        is_contract_initialized_validation(&e);
        let metadata = read_metadata(&e);
        metadata.is_active
    }

    fn get_admin(e: Env) -> Address {
        read_admin(&e)
    }
}

#[contractimpl]
impl TokenInterface for WrapperInterface {
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        todo!()
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        todo!()
    }

    fn balance(e: Env, id: Address) -> i128 {
        let asset_address = read_asset(&e);
        let asset_client = token::Client::new(&e, &asset_address);
        asset_client.balance(&id)
    }

    // --------------------------------------------------------------------------------
    // Asset Functions
    // --------------------------------------------------------------------------------
    //
    fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        is_contract_initialized_validation(&e);
        is_wrapper_active_validation(&e);

        from.require_auth();

        // invoke asset controller to validate transaction
        review_transfer(&e, &from, &to, &amount);

        let asset_address = read_asset(&e);
        let asset_client = token::Client::new(&e, &asset_address);

        let action = || {
            asset_client.transfer(&from, &to, &amount);
        };

        let addresses = vec![&e, from.clone(), to.clone()];
        execute_with_temporary_authorizations(&e, addresses, action);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        todo!()
    }

    fn burn(env: Env, from: Address, amount: i128) {
        todo!()
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        todo!()
    }

    fn decimals(e: Env) -> u32 {
        let asset_address = read_asset(&e);
        let asset_client = token::Client::new(&e, &asset_address);
        asset_client.decimals()
    }

    fn name(e: Env) -> String {
        let asset_address = read_asset(&e);
        let asset_client = token::Client::new(&e, &asset_address);
        asset_client.name()
    }

    fn symbol(e: Env) -> String {
        let asset_address = read_asset(&e);
        let asset_client = token::Client::new(&e, &asset_address);
        asset_client.symbol()
    }
}

#[contractimpl]
impl SpecifcFeaturesTrait for WrapperInterface {
    // --------------------------------------------------------------------------------
    // Admin interface – privileged functions.
    // --------------------------------------------------------------------------------
    //
    fn initialize(e: Env, admin: Address, asset: Address, asset_controller: Address) {
        is_contract_not_initialized_validation(&e);

        // If add asset.require_auth() can't use cli to sign. Do we need asset.require_auth() if
        // using non-issuer account?
        // asset.require_auth();
        admin.require_auth();

        let metadata = WrapperMetadata {
            enforced: true,
            is_active: true,
            admin,
            asset,
            asset_controller,
        };

        write_metadata(&e, &metadata);

        set_asset_admin(&e, &e.current_contract_address());
    }

    fn mint(e: Env, to: Address, amount: i128) {
        is_admin_validation(&e); // When checking for admin auth, it is not necessary to check for contract initialization

        let asset_address = read_asset(&e);
        let asset_admin_client = token::StellarAssetClient::new(&e, &asset_address);

        let action = || {
            asset_admin_client.mint(&to, &amount);
        };

        let addresses = vec![&e, to.clone()];
        execute_with_temporary_authorizations(&e, addresses, action);
    }

    // Does same stuff as mint but no underlying function calls
    fn mint_flatten(e: Env, to: Address, amount: i128) {
        is_admin_validation(&e);

        let asset_address = read_asset(&e);
        let asset_admin_client = token::StellarAssetClient::new(&e, &asset_address);

        set_account_authorization(&e, to.clone(), true);

        asset_admin_client.mint(&to, &amount);

        set_account_authorization(&e, to.clone(), false);
    }
}
