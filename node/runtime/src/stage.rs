pub type StageId = u32;

pub const IDLE:     StageId = 0;
pub const PREFLOP:  StageId = 1;
pub const FLOP:     StageId = 2;
pub const TURN:     StageId = 3;
pub const RIVER:    StageId = 4;
pub const SHOWDOWN: StageId = 5;