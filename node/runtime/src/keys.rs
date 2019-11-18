use crate::stage::*;

use codec::{Encode, Decode};
use core::result;
use rstd::prelude::*;

type ResultBytes = result::Result<Vec<u8>, &'static str>;
type ResultOptionBytes = result::Result<Option<Vec<u8>>, &'static str>;
type ResultUnit = result::Result<(), &'static str>;

pub const KEY_SIZE: usize = 32;

#[derive(Encode, Decode, Default, Clone)]
pub struct PublicStorage {
    pub pocket:  Vec<u8>,
    pub flop:  Vec<u8>,
    pub turn:  Vec<u8>,
    pub river: Vec<u8>
}

impl PublicStorage {

    pub fn is_initialized(&self) -> bool {
        !self.pocket.is_empty() ||
        !self.flop.is_empty() ||
        !self.turn.is_empty() ||
        !self.river.is_empty()
    }

    pub fn retrieve(self, stage: StageId) -> ResultBytes {
        match stage {
            FLOP => Ok(self.flop),
            TURN => Ok(self.turn),
            RIVER => Ok(self.river),

            _ => Err("Illegal argument")
        }
    }

    pub fn is_valid(&self) -> bool {
        self.pocket.len()  == KEY_SIZE &&
        self.flop.len()  == KEY_SIZE &&
        self.turn.len()  == KEY_SIZE &&
        self.river.len() == KEY_SIZE
    }

}

#[derive(Encode, Decode, Default, Clone)]
pub struct RevealedSecrets {
    pub pocket:  Option<Vec<u8>>,
    pub flop:  Option<Vec<u8>>,
    pub turn:  Option<Vec<u8>>,
    pub river: Option<Vec<u8>>
}

impl RevealedSecrets {

    pub fn retrieve(self, stage: StageId) -> ResultOptionBytes {
        match stage {
            FLOP  => Ok(self.flop),
            TURN  => Ok(self.turn),
            RIVER => Ok(self.river),
            SHOWDOWN => Ok(self.pocket),

            _ => Err("Illegal argument")
        }
    }

    pub fn submit(&mut self, stage: StageId, secret: Vec<u8>) -> ResultUnit {
        match stage {
            FLOP  => Ok(self.flop  = Some(secret)),
            TURN  => Ok(self.turn  = Some(secret)),
            RIVER => Ok(self.river = Some(secret)),
            SHOWDOWN => Ok(self.pocket = Some(secret)),

            _ => Err("Illegal argument")
        }
    }

    pub fn is_valid(&self) -> bool {
        vec![&self.pocket, &self.flop, &self.turn, &self.river].iter()
            .all(|secret| {
                secret.as_ref()
                    .map(|s| s.len() == KEY_SIZE)
                    .unwrap_or(true)
            })
    }

}