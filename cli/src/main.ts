#!/usr/bin/env node

import { ApiPromise, Keyring } from "@polkadot/api";
import { getWsProvider } from "./utils/connection";
import {getSigner, sendAndReturnCollated} from "./utils/signer";
import TokenUnit from "./utils/token";

import yargs = require("yargs");
import { Arguments, Argv } from "yargs";

import { CUSTOM_TYPES } from "./utils/types";

async function main() {
    const api = await ApiPromise.create({
        provider: getWsProvider(),
        types: CUSTOM_TYPES,
    });

    const token = await TokenUnit.provide(api);
    const keyring = new Keyring({ type: "sr25519" });

    yargs
        .option("seed", { alias: "s", global: true, default: "//Alice" })
        .command("test", "Retrieve state of the game from storage",
            (args: Argv) => {
                return args.option("field", { alias: "f", type: "string" });
            }, async (args) => {
                const alice = getSigner(keyring, "//Alice");
                const bob = getSigner(keyring, "//Bob");

                console.log("Dealer: ", (await api.query.poker.dealer()).toString());
                console.log("Player: ", (await api.query.poker.player()).toString());
                await sendAndReturnCollated(alice, api.tx.poker.createGame(1000, 10));
                console.log("Dealer: ", (await api.query.poker.dealer()).toString());
                console.log("Player: ", (await api.query.poker.player()).toString());
                await sendAndReturnCollated(bob, api.tx.poker.joinGame(2000));
                console.log("Dealer: ", (await api.query.poker.dealer()).toString());
                console.log("Player: ", (await api.query.poker.player()).toString());

                process.exit(0);
            })
        .demandCommand()
        .argv;
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
