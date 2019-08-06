const keys = require('./keys.js');

export const Idle = 0;
export const Preflop = 1;
export const Flop = 2;
export const Turn = 3;
export const River = 4;
export const Showdown = 5;

export let StageToName = new Map([
    [Flop, "flop"],
    [Turn, "turn"],
    [River, "river"],
    [Showdown, 'pocket']
]);

export let Stages = StageToName.keys();

export function secretFromStage(stage) {
    console.assert(stage >= Flop && stage <= Showdown);
    return keys.StageToKeyBond.get(stage).map(key => {
        console.log("modulus", key.modulus);
        console.log("exponent", key.exponent);
        return key.exponent;
    });
}