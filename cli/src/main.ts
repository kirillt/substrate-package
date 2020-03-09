#!/usr/bin/env node

import { ApiPromise, Keyring } from "@polkadot/api";
import { getWsProvider } from "./utils/connection";
import {getSigner, sendAndReturnCollated} from "./utils/signer";
import TokenUnit from "./utils/token";

import yargs = require("yargs");
import { Arguments, Argv } from "yargs";

import { TYPES } from "./utils/types";

async function main() {
    const api = await ApiPromise.create(Object.assign(
        { provider: getWsProvider() },
        TYPES,
    ));

    const token = await TokenUnit.provide(api);
    const keyring = new Keyring({ type: "sr25519" });

    yargs
        .option("seed", { alias: "s", global: true })
        .command("state", "Retrieve state of the game from storage",
            (args: Argv) => {
                return args.option("field", { alias: "f", type: "string" });
            }, async (args) => {
                process.exit(0);
            })
        .command("create", "Initialize a game",
            (args: Argv) => {
                return args
                    .option("big-blind", { alias: "b", type: "string" })
                    .option("buy-in", { alias: "i", type: "string" });
            }, async (args) => {
                const participant = getSigner(keyring, args.seed as string);
                const bigBlind = token.parseBalance(args["big-blind"] as string | number);
                const buyIn = token.parseBalance(args["buy-in"] as string | number);
                console.log(`Creating new game with ${bigBlind} for big blind, bringing ${buyIn} chips to the table`);
                await sendAndReturnCollated(participant, api.tx.poker.createGame(buyIn, bigBlind));

                process.exit(0);
            })
        .command("join", "Join the game",
            (args: Argv) => {
                return args.option("buy-in", { alias: "i", type: "string" });
            }, async (args) => {
                const participant = getSigner(keyring, args.seed as string);
                const buyIn = token.parseBalance(args["buy-in"] as string | number);
                console.log(`Joining the game with ${buyIn} chips`);
                await sendAndReturnCollated(participant, api.tx.poker.joinGame(buyIn));

                process.exit(0);
            })
        .demandCommand()
        .argv;
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
