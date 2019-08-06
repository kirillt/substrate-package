#![allow(dead_code)]

use crate::cards::{Card, Nominal, A, K, Q, J};

use rstd::prelude::*;
use rstd::cmp::Ordering::{
    self, Equal, Greater, Less
};

pub type Rank = u8;

pub const STRAIGHT_FLUSH:  Rank = 8;
pub const QUAD:            Rank = 7;
pub const FULL_HOUSE:      Rank = 6;
pub const FLUSH:           Rank = 5;
pub const STRAIGHT:        Rank = 4;
pub const THREE_OF_A_KIND: Rank = 3;
pub const TWO_PAIR:        Rank = 2;
pub const ONE_PAIR:        Rank = 1;
pub const HIGH_CARD:       Rank = 0;

#[derive(Debug)]
pub struct RankedHand {
    pub combination: Combination,
    cards: Vec<Card>,
}

#[derive(PartialEq, Eq, Debug)]
pub struct Combination {
    pub rank: Rank,
    pub high: Nominal,
}

pub fn classify(hand: &[Card]) -> Combination {
    debug_assert!(hand.len() == 5);
    let is_flush = hand.iter().all(|c| c.suit == hand[0].suit);

    let mut nominals: Vec<Nominal> = hand.iter()
        .map(|c| c.nominal)
        .collect();
    nominals.sort();

    let (high, is_straight) = if nominals[0] != A {
        let perfect: Vec<u8> = (nominals[0]..nominals[4] + 1).collect();
        (nominals[4], nominals == perfect)
    } else {
        if nominals[4] == 5 {
            (5, nominals == vec![A,2,3,4,5])
        } else {
            (A, nominals == vec![A,10,J,Q,K])
        }
    };

    if is_flush && is_straight {
        return Combination { rank: STRAIGHT_FLUSH, high };
    } else if is_flush {
        return Combination { rank: FLUSH, high };
    } else if is_straight {
        return Combination { rank: STRAIGHT, high };
    }

    if nominals.windows(4).any(|quad| quad.iter().all(|x| *x == quad[0])) {
        return Combination { rank: QUAD, high: nominals[2] };
    }

    if nominals[0] == nominals[1] && nominals[3] == nominals[4] &&
        (nominals[2] == nominals[1] || nominals[2] == nominals[3]) {
        return Combination { rank: FULL_HOUSE, high: nominals[2] };
    }

    if let Some(nominal) = nominals.windows(3).find_map(|triple|
        if triple[0] == triple[1] && triple[1] == triple[2] {
            Some(triple[0])
        } else { None }) {
            return Combination { rank: THREE_OF_A_KIND, high: nominal };
        }

    let mut paired_nominals: Vec<Nominal> = nominals.windows(2)
        .filter(|pair| pair[0] == pair[1])
        .map(|pair| pair[0])
        .collect();
    paired_nominals.sort();
    paired_nominals.dedup();

    if paired_nominals.len() == 2 {
        return Combination {
            rank: TWO_PAIR,
            high: if paired_nominals[0] != A {
                paired_nominals[1]
            } else {
                A
            }
        };
    }

    if paired_nominals.len() == 1 {
        let high = paired_nominals[0];
        return Combination {
            rank: ONE_PAIR,
            high
        };
    }

    return Combination {
        rank: HIGH_CARD,
        high
    }
}

impl Ord for RankedHand {
    fn cmp(&self, other: &Self) -> Ordering {
        let left_combination = &self.combination;
        let right_combination = &other.combination;

        let ranks_cmp = left_combination.rank.cmp(&right_combination.rank);
        if ranks_cmp == Equal {
            let left_high = left_combination.high;
            let left_high = if left_high == A { 14 } else { left_high };
            let right_high = right_combination.high;
            let right_high = if right_high == A { 14 } else { right_high };

            let high_cards_cmp = left_high.cmp(&right_high);
            if high_cards_cmp == Equal {
                let mut left: Vec<Nominal> = self.cards.iter()
                    .map(|c| c.nominal)
                    .collect();
                left.sort();

                let mut right: Vec<Nominal> = other.cards.iter()
                    .map(|c| c.nominal)
                    .collect();
                right.sort();

                if left[0] == A && right[0] != A {
                    return Greater;
                }
                if left[0] != A && right[0] == A {
                    return Less;
                }

                for i in (0..5).rev() {
                    let result = left[i].cmp(&right[i]);
                    if result != Equal {
                        return result;
                    }
                }

                Equal
            } else {
                high_cards_cmp
            }
        } else {
            ranks_cmp
        }
    }
}

impl PartialOrd for RankedHand {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for RankedHand {
    fn eq(&self, other: &Self) -> bool {
        self.cmp(other) == Equal
    }
}

impl Eq for RankedHand {}

pub fn choose_strongest_five(seven: &[Card]) -> RankedHand {
    let mut cards: Vec<Card> = seven.iter().cloned().collect();
    cards.sort_by(|l,r| l.nominal.cmp(&r.nominal));

    let variants = (0..7).flat_map(|i|
        (0..7).filter(move |j| i != *j)
              .map(move |j| (i,j)));

    let mut fives: Vec<Vec<Card>> = variants.map(move |(i,j)| {
        let mut result = vec![];
        for k in 0..7 {
            if k != i && k != j {
                result.push(cards[k].clone());
            }
        }
        result
    }).collect();
    fives.sort();
    fives.dedup();

    let mut ranked = fives.into_iter().map(|five| RankedHand {
        combination: classify(&five[..]),
        cards: five
    });

    let head = ranked.next().unwrap();
    ranked.fold(head, |x,y| {
        if x.cmp(&y) == Greater { x } else { y }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cards::*;

    use permutohedron::heap_recursive;

    #[test]
    fn best_five_cards_of_seven_are_chosen() {
        fn check(a: Card, b: Card, c: Card, d: Card, e: Card, f: Card, g: Card) -> RankedHand {
            let mut cards = vec![a,b,c,d,e,f,g];
            let etalon = choose_strongest_five(&cards);
            heap_recursive(&mut cards, |permutation| { //720 of variants
                assert_eq!(etalon, choose_strongest_five(&permutation));
            });
            etalon
        }

        let high_card_king = check(spades(2), hearts(J), spades(8), spades(7), hearts(K), hearts(9), clubs(5));
        assert_eq!(high_card_king.combination.rank, HIGH_CARD);
        assert_eq!(high_card_king.combination.high, K);

        let pair_of_kings = check(spades(K), hearts(J), spades(8), spades(7), hearts(K), hearts(9), clubs(5));
        assert_eq!(pair_of_kings.combination.rank, ONE_PAIR);
        assert_eq!(pair_of_kings.combination.high, K);

        let jacks_and_tens = check(diamonds(10), clubs(J), spades(8), clubs(6), hearts(10), hearts(9), diamonds(J));
        assert_eq!(jacks_and_tens.combination.rank, TWO_PAIR);
        assert_eq!(jacks_and_tens.combination.high, J);
        assert_eq!(jacks_and_tens.cards.iter().map(|c| c.nominal)
            .collect::<Vec<Nominal>>(),
            vec![9, 10, 10, J, J]);

        let queens_and_jacks = check(diamonds(10), clubs(J), spades(Q), clubs(Q), hearts(10), hearts(9), diamonds(J));
        assert_eq!(queens_and_jacks.combination.rank, TWO_PAIR);
        assert_eq!(queens_and_jacks.combination.high, Q);
        assert_eq!(queens_and_jacks.cards.iter().map(|c| c.nominal)
            .collect::<Vec<Nominal>>(),
            vec![10, J, J, Q, Q]);

        let flush_of_spades = check(spades(10), clubs(J), spades(K), clubs(K), spades(10), spades(9), spades(J));
        assert_eq!(flush_of_spades.combination.rank, FLUSH);
        assert_eq!(flush_of_spades.combination.high, K);

        let royal_flush = check(hearts(10), hearts(J), hearts(K), hearts(Q), hearts(A), hearts(9), hearts(8));
        assert_eq!(royal_flush.combination.rank, STRAIGHT_FLUSH);
        assert_eq!(royal_flush.combination.high, A);

        let steel_wheel = check(hearts(2), hearts(4), hearts(3), spades(2), hearts(A), spades(9), hearts(5));
        assert_eq!(steel_wheel.combination.rank, STRAIGHT_FLUSH);
        assert_eq!(steel_wheel.combination.high, 5);
    }

    #[test]
    fn hands_comparision_is_correct() {
        fn check(mut left: Vec<Card>, mut right: Vec<Card>) -> Ordering {
            let etalon = {
                let left = RankedHand { combination: classify(&left[..]), cards: left.clone() };
                let right = RankedHand { combination: classify(&right[..]), cards: right.clone() };
                left.cmp(&right)
            };

            heap_recursive(&mut left, |left_perm| {
                let left = RankedHand { combination: classify(&left_perm[..]),
                    cards: left_perm.iter().cloned().collect() };
                assert_eq!(left.cmp(&left), Equal);

                heap_recursive(&mut right, |right_perm| { //14400 of variants
                    let right = RankedHand { combination: classify(&right_perm[..]),
                        cards: right_perm.iter().cloned().collect() };
                    assert_eq!(left.cmp(&right), etalon);
                    assert_eq!(right.cmp(&left), etalon.reverse());
                });
            });

            heap_recursive(&mut right, |right_perm| {
                let right = RankedHand { combination: classify(&right_perm[..]),
                    cards: right_perm.iter().cloned().collect() };
                assert_eq!(right.cmp(&right), Equal);
            });

            etalon
        }

        assert_eq!(check(
            vec![spades(2), spades(4), spades(5), spades(7), spades(A)],
            vec![hearts(2), hearts(3), hearts(5), hearts(7), hearts(A)]),
                   Greater);

        assert_eq!(check(
            vec![spades(2), spades(3), spades(5), spades(7), spades(A)],
            vec![hearts(2), clubs(4), hearts(5), hearts(8), hearts(K)]),
                   Greater);

        assert_eq!(check(
            vec![spades(2), hearts(3), spades(5), clubs(7), spades(A)],
            vec![hearts(2), clubs(4), hearts(5), hearts(8), hearts(K)]),
                   Greater);

        assert_eq!(check(
            vec![diamonds(10), clubs(J), hearts(10), hearts(9), diamonds(J)],
            vec![diamonds(10), clubs(J), spades(8), hearts(10), diamonds(J)]),
                   Greater);

        assert_eq!(check(
            vec![hearts(10), hearts(J), hearts(K), hearts(Q), hearts(A)],
            vec![hearts(10), hearts(J), hearts(K), hearts(Q), hearts(9)]),
                   Greater);

        assert_eq!(check(
            vec![hearts(10), clubs(J), hearts(10), hearts(9), diamonds(Q)],
            vec![hearts(10), diamonds(J), spades(8), hearts(10), diamonds(K)]),
                   Less);

        assert_eq!(check(
            vec![diamonds(K), hearts(3), diamonds(A), clubs(7), spades(A)],
            vec![hearts(K), clubs(K), hearts(Q), hearts(8), spades(K)]),
                   Less);

        assert_eq!(check(
            vec![diamonds(A), hearts(2), diamonds(3), clubs(4), spades(5)],
            vec![hearts(2), clubs(3), hearts(4), hearts(5), spades(6)]),
                   Less);

        assert_eq!(check(
            vec![diamonds(K), hearts(3), diamonds(A), clubs(7), spades(A)],
            vec![hearts(K), diamonds(3), clubs(A), spades(7), hearts(A)]),
                   Equal);
    }

    #[test]
    fn combinations_are_detected_correctly() {
        fn check(a: Card, b: Card, c: Card, d: Card, e: Card) -> Combination {
            let mut cards = vec![a,b,c,d,e];
            let etalon = classify(&cards);
            heap_recursive(&mut cards, |permutation| { //120 of variants
                assert_eq!(etalon, classify(permutation));
            });
            etalon
        }

        let royal_flush = check(hearts(10), hearts(J), hearts(Q), hearts(K), hearts(A));
        assert_eq!(royal_flush.rank, STRAIGHT_FLUSH);
        assert_eq!(royal_flush.high, A);

        let king_straight_flush = check(hearts(9), hearts(10), hearts(J), hearts(Q), hearts(K));
        assert_eq!(king_straight_flush.rank, STRAIGHT_FLUSH);
        assert_eq!(king_straight_flush.high, K);

        let steel_wheel = check(hearts(A), hearts(2), hearts(3), hearts(4), hearts(5));
        assert_eq!(steel_wheel.rank, STRAIGHT_FLUSH);
        assert_eq!(steel_wheel.high, 5);

        let king_straight = check(hearts(9), spades(10), hearts(J), clubs(Q), hearts(K));
        assert_eq!(king_straight.rank, STRAIGHT);
        assert_eq!(king_straight.high, K);

        let seven_straight = check(spades(3), hearts(4), diamonds(5), clubs(6), spades(7));
        assert_eq!(seven_straight.rank, STRAIGHT);
        assert_eq!(seven_straight.high, 7);

        let five_straight = check(spades(A), spades(2), clubs(3), clubs(4), diamonds(5));
        assert_eq!(five_straight.rank, STRAIGHT);
        assert_eq!(five_straight.high, 5);

        let hearts_flush = check(hearts(2), hearts(5), hearts(7), hearts(K), hearts(J));
        assert_eq!(hearts_flush.rank, FLUSH);
        assert_eq!(hearts_flush.high, K);

        let spades_flush = check(spades(3), spades(4), spades(9), spades(10), spades(J));
        assert_eq!(spades_flush.rank, FLUSH);
        assert_eq!(spades_flush.high, J);

        let clubs_flush = check(clubs(10), clubs(4), clubs(9), clubs(8), clubs(A));
        assert_eq!(clubs_flush.rank, FLUSH);
        assert_eq!(clubs_flush.high, A);

        let diamonds_flush = check(diamonds(2), diamonds(5), diamonds(4), diamonds(3), diamonds(8));
        assert_eq!(diamonds_flush.rank, FLUSH);
        assert_eq!(diamonds_flush.high, 8);

        let quad_of_threes = check(clubs(4), clubs(3), spades(3), diamonds(3), hearts(3));
        assert_eq!(quad_of_threes.rank, QUAD);
        assert_eq!(quad_of_threes.high, 3);

        let quad_of_aces = check(clubs(A), spades(A), diamonds(A), hearts(A), clubs(K));
        assert_eq!(quad_of_aces.rank, QUAD);
        assert_eq!(quad_of_aces.high, A);

        let quad_of_jacks = check(spades(J), clubs(J), hearts(J), diamonds(J), clubs(K));
        assert_eq!(quad_of_jacks.rank, QUAD);
        assert_eq!(quad_of_jacks.high, J);

        let full_house_of_kings = check(spades(K), clubs(K), hearts(K), diamonds(Q), clubs(Q));
        assert_eq!(full_house_of_kings.rank, FULL_HOUSE);
        assert_eq!(full_house_of_kings.high, K);

        let full_house_of_queens = check(spades(Q), clubs(Q), hearts(Q), diamonds(K), clubs(K));
        assert_eq!(full_house_of_queens.rank, FULL_HOUSE);
        assert_eq!(full_house_of_queens.high, Q);

        let full_house_of_twos = check(spades(2), clubs(2), hearts(2), diamonds(A), clubs(A));
        assert_eq!(full_house_of_twos.rank, FULL_HOUSE);
        assert_eq!(full_house_of_twos.high, 2);

        let set_of_aces = check(spades(A), clubs(A), hearts(A), diamonds(2), clubs(K));
        assert_eq!(set_of_aces.rank, THREE_OF_A_KIND);
        assert_eq!(set_of_aces.high, A);

        let set_of_queens = check(clubs(Q), hearts(Q), diamonds(Q), clubs(A), hearts(J));
        assert_eq!(set_of_queens.rank, THREE_OF_A_KIND);
        assert_eq!(set_of_queens.high, Q);

        let set_of_twos = check(diamonds(2), spades(2), hearts(2), diamonds(A), spades(3));
        assert_eq!(set_of_twos.rank, THREE_OF_A_KIND);
        assert_eq!(set_of_twos.high, 2);

        let two_pair_of_aces = check(spades(A), clubs(A), hearts(K), clubs(K), hearts(J));
        assert_eq!(two_pair_of_aces.rank, TWO_PAIR);
        assert_eq!(two_pair_of_aces.high, A);

        let two_pair_of_sevens = check(hearts(7), clubs(7), spades(2), clubs(2), clubs(J));
        assert_eq!(two_pair_of_sevens.rank, TWO_PAIR);
        assert_eq!(two_pair_of_sevens.high, 7);

        let one_pair_of_sevens = check(clubs(7), spades(7), spades(2), clubs(3), clubs(J));
        assert_eq!(one_pair_of_sevens.rank, ONE_PAIR);
        assert_eq!(one_pair_of_sevens.high, 7);

        let one_pair_of_kings = check(clubs(K), spades(K), spades(2), spades(3), spades(A));
        assert_eq!(one_pair_of_kings.rank, ONE_PAIR);
        assert_eq!(one_pair_of_kings.high, K);

        let one_pair_of_aces = check(diamonds(A), spades(A), spades(2), spades(3), spades(4));
        assert_eq!(one_pair_of_aces.rank, ONE_PAIR);
        assert_eq!(one_pair_of_aces.high, A);

        let high_card_jack = check(diamonds(J), hearts(10), hearts(9), hearts(8), hearts(6));
        assert_eq!(high_card_jack.rank, HIGH_CARD);
        assert_eq!(high_card_jack.high, J);

        let high_card_ace = check(hearts(J), spades(10), clubs(9), spades(8), clubs(A));
        assert_eq!(high_card_ace.rank, HIGH_CARD);
        assert_eq!(high_card_ace.high, A);

        let high_card_seven = check(spades(2), spades(3), hearts(5), clubs(6), clubs(7));
        assert_eq!(high_card_seven.rank, HIGH_CARD);
        assert_eq!(high_card_seven.high, 7);
    }
}