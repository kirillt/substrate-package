export const TYPES = {
    types: {
        Combination: {
            rank: "u32",
            high: "u32",
        },
        WinLossInfo: {
            winner: "Account",
            win_hand: "Combination",
            loser: "Account",
            loss_hand: "Combination",
        },
        "keys::PublicStorage": {
            pocket: "Vec<u8>",
            flop: "Vec<u8>",
            turn: "Vec<u8>",
            river: "Vec<u8>",
        },
        "keys::RevealedSecrets": {
            pocket: "Option<Vec<u8>>",
            flop: "Option<Vec<u8>>",
            turn: "Option<Vec<u8>>",
            river: "Option<Vec<u8>>",
        },
    },
};
