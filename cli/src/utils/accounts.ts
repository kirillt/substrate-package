import { Keyring } from "@polkadot/api";
import { blake2AsHex } from "@polkadot/util-crypto";

export function constructLabel(id: string): string {
    if (id.startsWith("/")) {
        return id;
    }

    return shorten(id);
}

export function unfoldId(keyring: Keyring, id: string): string {
    if (id.startsWith("/")) {
        return keyring.addFromUri(id).address;
    }

    return id;
}

function shorten(long: string): string {
    const n = long.length;
    return long.substr(0, 4) + "..."
        + long.substr(n - 1 - 4, 4);
}
