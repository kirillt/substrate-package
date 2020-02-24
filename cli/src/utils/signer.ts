import { SubmittableResult } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { EventRecord } from "@polkadot/types/interfaces";
import { u8aToHex } from "@polkadot/util";
import { constructLabel } from "./accounts";

export function getSigner(keyring: Keyring, seed: string): KeyringPair {
    const signer = keyring.addFromUri(seed);
    console.log(`Signing transaction with "${constructLabel(seed)}":
        address: ${signer.address}
        public key: ${u8aToHex(signer.publicKey)}`);

    return signer;
}

export async function sendAndReturnFinalized(signer: KeyringPair, tx: any) {
    return new Promise((resolve, reject) => {
        tx.signAndSend(signer, (result: SubmittableResult) => {
            if (result.status.isFinalized) {
                console.log("Events received:", result.events.map((e: EventRecord) =>
                    `${e.event.section}: ${e.event.method}`));
                resolve(result as SubmittableResult);
            }
            if (result.status.isDropped ||
                result.status.isInvalid ||
                result.status.isUsurped) {
                reject(result as SubmittableResult);
                throw new Error("Transaction could not be finalized.");
            }
        });
    });
}
