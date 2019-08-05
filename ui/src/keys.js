import {pretty} from "oo7-substrate";
import { Bond } from 'oo7';

const stages = require('./stages.js');

const NodeRSA = require('node-rsa');

export const Pocket = new Bond();
export const Flop = new Bond();
export const Turn = new Bond();
export const River = new Bond();
export const Showdown = Pocket;

export let StageToKeyBond = new Map([
    [stages.Flop, Flop],
    [stages.Turn, Turn],
    [stages.River, River],
    [stages.Showdown, Showdown],
]);

export function generate () {
    for (let [stage, name] of stages.StageToName) {
        generateKeyPair(name, StageToKeyBond.get(stage));
    }
}

export function load () {
    for (let [stage, name] of stages.StageToName) {
        loadKeyIntoBond(name, StageToKeyBond.get(stage));
    }
}

export function clear () {
    console.assert(game.user.isReady());
    for (let [stage, name] of stages.StageToName) {
        StageToKeyBond.get(stage).reset();
        clearStorage(name);
    }
}

function clearStorage (field) {
    console.log(`Clearing '${field}' key`);
    localStorage.setItem(modulusField(field), "");
    localStorage.setItem(exponentField(field), "");
}

function loadKeyIntoBond (field, bond) {
    console.log(`Loading '${field}' key`);
    let modulus = localStorage.getItem(modulusField(field));
    let exponent = localStorage.getItem(exponentField(field));

    if (modulus !== "" && exponent !== "") {
        console.assert(modulus);
        console.assert(exponent);
        modulus = Buffer.from(modulus, 'hex');
        exponent = Buffer.from(exponent, 'hex');
        console.assert(modulus.length === 32, "public key must consist of 32 bytes");
        console.assert(exponent.length === 32, "private key must consist of 32 bytes");

        bond.changed({ modulus: modulus, exponent: exponent });
    } else {
        bond.reset();
    }
}

function generateKeyPair (field, bond) {
    console.log(`Generating '${field}' key`);
    const key = new NodeRSA({b: 256}, 'components', 'browser');

    const components = key.exportKey('components');
    console.assert(components.e === 65537);

    //keys are stored in little-endian format
    const modulus = components.n.slice(-32).reverse();
    const exponent = components.d.slice(-32).reverse();
    console.assert(modulus.length === 32, "public key must consist of 32 bytes");
    console.assert(exponent.length === 32, "private key must consist of 32 bytes");

    localStorage.setItem(modulusField(field), Buffer.from(modulus).toString('hex'));
    localStorage.setItem(exponentField(field), Buffer.from(exponent).toString('hex'));
    bond.changed({modulus: modulus, exponent: exponent});
}

const STORAGE_PREFIX = 'blockchain_poker';
const MODULUS_SUFFIX = 'key_modulus';
const EXPONENT_SUFFIX = 'key_exponent';

function modulusField (keyName) {
    console.assert(game.user._value);
    return `${STORAGE_PREFIX}_${pretty(game.user._value)}_${keyName}_${MODULUS_SUFFIX}`;
}

function exponentField (keyName) {
    console.assert(game.user._value);
    return `${STORAGE_PREFIX}_${pretty(game.user._value)}_${keyName}_${EXPONENT_SUFFIX}`;
}