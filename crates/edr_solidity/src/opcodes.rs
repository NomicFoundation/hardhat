use edr_evm::interpreter::opcode;

fn is_push(opcode: u8) -> bool {
    (opcode::PUSH1..=opcode::PUSH32).contains(&opcode)
}

fn push_length(opcode: u8) -> usize {
    (opcode - opcode::PUSH1 + 1) as usize
}

pub fn opcode_length(opcode: u8) -> usize {
    if !is_push(opcode) {
        return 1;
    }

    1 + push_length(opcode)
}
