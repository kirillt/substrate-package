export function addTransforms () {
    addCodecTransform('Combination', {
        rank: 'u32',
        high: 'u32'
    });

    addCodecTransform('WinLossInfo<AccountId>', {
        winner: 'AccountId',
        win_hand: 'Combination',
        loser: 'AccountId',
        loss_hand: 'Combination'
    });

    addCodecTransform('keys::PublicStorage', {});
    addCodecTransform('keys::RevealedSecrets', {});
}