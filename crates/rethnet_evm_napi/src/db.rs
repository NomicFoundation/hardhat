use napi::{
    threadsafe_function::{ErrorStrategy, ThreadsafeFunction},
    Status,
};
use rethnet_evm::{AccountInfo, Database, H160};

pub struct HardhatDatabase {
    get_account_by_address_fn: ThreadsafeFunction<H160, ErrorStrategy::Fatal>,
}

impl HardhatDatabase {
    pub fn new(get_account_by_address_fn: ThreadsafeFunction<H160, ErrorStrategy::Fatal>) -> Self {
        Self {
            get_account_by_address_fn,
        }
    }
}

impl Database for HardhatDatabase {
    fn basic(&mut self, address: H160) -> AccountInfo {
        println!("CALL START");
        assert_eq!(
            self.get_account_by_address_fn.call(
                address,
                napi::threadsafe_function::ThreadsafeFunctionCallMode::Blocking,
            ),
            Status::Ok
        );
        println!("CALL ENDED");

        AccountInfo::default()
    }

    fn code_by_hash(&mut self, code_hash: rethnet_evm::H256) -> rethnet_evm::Bytecode {
        todo!()
    }

    fn storage(&mut self, address: H160, index: rethnet_evm::U256) -> rethnet_evm::U256 {
        todo!()
    }

    fn block_hash(&mut self, number: rethnet_evm::U256) -> rethnet_evm::H256 {
        todo!()
    }
}
