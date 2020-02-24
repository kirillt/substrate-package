#!/usr/bin/env node

import { ApiPromise, Keyring } from "@polkadot/api";
import { KeyringPair } from "@polkadot/keyring/types";
import { H256, Option } from "@polkadot/types";
import { ContractInfo, Hash } from "@polkadot/types/interfaces";
import { u8aToHex } from "@polkadot/util";
import { getWsProvider } from "./utils/connection";
import {getSigner, sendAndReturnFinalized} from "./utils/signer";
import TokenUnit from "./utils/token";

import blake = require("blakejs");

import yargs = require("yargs");
import { Arguments, Argv } from "yargs";

import { CUSTOM_TYPES } from "./utils/types";
import fs from "fs";

async function main() {
    const api = await ApiPromise.create({
        provider: getWsProvider(),
        types: CUSTOM_TYPES,
    });

    const token = await TokenUnit.provide(api);
    const keyring = new Keyring({ type: "sr25519" });

    yargs
        .option("seed", { alias: "s", global: true, default: "//Alice" })
        .command("state", "Retrieve state of the game from storage",
            (args: Argv) => {
                return args.option("field", { alias: "f", type: "string" });
            }, async (args) => {
                // const signer = getSigner(keyring, args.seed as string);
                //
                // const x = await api.tx.gather
                //     .createGroup(1, "", null)
                //     .signAndSend(signer);

                let x = await api.rpc.rpc.methods();
                // await api.query.gather[items](id);

                console.log("x:", x);
                console.log("x:", JSON.stringify(x, null, 2));

                process.exit(0);
            })
        .demandCommand()
        .argv;
}

const ROOT_PREFIX: Uint8Array = new Uint8Array(0);

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
