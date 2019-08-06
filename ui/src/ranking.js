export function printCombination(rank, nominal) {
    switch (rank) {
        case 8: return `Straight flush up to ${printNominal(nominal)}!`;
        case 7: return `Four ${printNominal(nominal)}s!`;
        case 6: return `Full house with ${printNominal(nominal)}s!`;
        case 5: return `Flush with high card ${printNominal(nominal)}`;
        case 4: return `Straight up to ${printNominal(nominal)}`;
        case 3: return `Three ${printNominal(nominal)}s`;
        case 2: return `Two pair (high ${printNominal(nominal)}s)`;
        case 1: return `Pair of ${printNominal(nominal)}s`;
        case 0: return `High card ${printNominal(nominal)}`;
    }
}

export function printNominal(nominal) {
    switch (nominal) {
        case 13: return "King";
        case 12: return "Queen";
        case 11: return "Jack";
        case 10: return "10";
        case 9:  return "9";
        case 8:  return "8";
        case 7:  return "7";
        case 6:  return "6";
        case 5:  return "5";
        case 4:  return "4";
        case 3:  return "3";
        case 2:  return "2";
        case 1:  return "Ace";
    }
}