// The Fusaka hardfork introduced a gas limit of 2^24 to individual transactions
// as part of EIP 7825. From Amsterdam on it applies to execution gas only.
export const FUSAKA_TRANSACTION_GAS_LIMIT = 16777216;

// The most gas a transaction can use from Amsterdam: EIP-8037 caps a
// transaction's total gas, execution and state, at 2^32 - 1.
export const EIP_8037_MAX_TRANSACTION_GAS_LIMIT = 4_294_967_295;
