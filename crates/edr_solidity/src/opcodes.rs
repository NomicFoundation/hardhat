use revm::interpreter::opcode;

fn is_push(opcode: u8) -> bool {
    (opcode::PUSH1..=opcode::PUSH32).contains(&opcode)
}

fn get_push_length(opcode: u8) -> usize {
    (opcode - opcode::PUSH1 + 1) as usize
}

pub fn get_opcode_length(opcode: u8) -> usize {
    if !is_push(opcode) {
        return 1;
    }

    1 + get_push_length(opcode)
}
