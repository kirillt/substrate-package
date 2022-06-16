# Substrate Poker

This is a Proof-of-Concept of cryptographically protected Poker game based on Substrate framework.

## Quick start

To run the game you have to:
* Go to `node` directory, build the project and run it.
* Then go to `ui` directory, install dependencies with `yarn install` and run the UI with `yarn run dev`.
* Open `localhost:8000` in browser for every player and log-in with a development account.

Enjoy!

## Features

### Full cards encryption

All cards are stored _on-chain_ and stay there forever for possibility to verify fairness of the game outcome and lack of any cheating. There is no side which can replace dealt cards or reveal opponent's cards. All hidden cards are encrypted to avoid obtaining them by a non-authorized party. A player decrypts their own cards client-side using their own game key. There is no _"poker room"_ which can speculate with Random Number Generator or monitor player's cards.

### Simple commit-reveal scheme for cards at hands

This is **simplified version of the protocol** used, from perspective of private player's cards (a _"hand"_):
* When a new round begins, all players generate their round key pairs and commit public keys _on-chain_.
* Blockchain node deals cards:
    * each _hand_ is encrypted using public part of the corresponding player's round key
    * all cards are stored _on-chain_ in encrypted form
* Players make bets and move through number of stages: _"pre-flop"_, _"flop"_, _"turn"_ and _"river"_.
* Each player can reveal their _hand_ by revealing private part of the corresponding round key.

### History verifiability

When it's time for a _"showdown"_ and you choose to reveal your cards, then your _hand_ becomes public and verifiable for the whole life of the blockchain. If you don't want to reveal cards, you can do it according to rules of Poker game. Private part of round keypair can be discarded at client-side, so nobody will know you went all-in with 🂲🂧 ;) Technically, you can also save your round key and reveal it long after the round is over, proving the _hand_ you had.

### Atomic cards dealing

This is closer look at cards dealing. In fact this protocol is **advanced commit-reveal scheme**.

We need to remember already dealt cards and use this information when we deal new cards so they would not repeat. But since we keep all cards _on-chain_, i.e. in public access, then we can't just store a state of card deck _as-is_, because this information would reveal set of cards at players' _hands_. Precise mapping player-cards would not be possible in most cases, but amount of possible combinations would be limited. So, all cards are dealt at once, atomically. What looks like dealing a new portion of shared cards is, basically, only revealing it.

The following protocol is used in order to achieve this:
* When a new round begins, all players generate their round key pairs and commit public keys _on-chain_.
  In fact, 4 key pairs are generated for each round, by every player:
    * 1 key pair for private cards: _hand_ key
    * 3 key pairs for game stages: _flop_, _turn_ and _river_ keys
* Blockchain node deals cards:
    * generates random deck of cards
    * selects private cards for each player (_hands_) and shared cards
    * each _hand_ is encrypted using public part of the corresponding player's round key
    * shared cards are encrypted using all round keys
    * all cards are stored _on-chain_ in encrypted form
* Dealing new portion of shared cards requires all players to reveal their private keys for the corresponding stage.
* _Showdown_ as described in the earlier chapter.

When the game moves to the next stage, e.g. from _pre-flop_ to _flop_, all players are required to commit their _flop_ keys. These keys are used to decrypt shared cards. For better performance, this _atomic dealing_ should use _commutative_ encryption, which would allow to remove 1 layer of encryption immediately after receiving a stage key from any player in any order. At the moment, layers can be removed only in strict order and we can't do useful work while we're waiting for next key.

### Decentralized and free to use

Players set up their games themselves and play when they want. Nobody can block your account for vague reason. Your funds are safe and stored in your wallet. You can have alternative, custom User Interface. It's pretty easy to construct even CLI client if you want so.

## Limitations of this prototype

* Only 2 players in a game (_"heads-up"_), only 1 game at the same moment.

* Encryption is implemented with naive RSA implementation without non-determinism. It must be replaced with _off-chain_ encryption, provided by Substrate framework. Currently, it is not secure at all. 64-bit keys are used.

* Block hashes and submitted public keys are used as a seed for a randomizer. It's not truly random and, what is more important, an attacker could compute cards using this data and knowledge about source code. Random Number Generation must be performed _off-chain_. Even better would be to connect to consensus engine and extract random values from it.

* Cards with nominals `A`,`2` and `3` are 6.25% more frequent due to conversion of a 4-bit number into a nominal.

* Commutative encryption should be used in future versions. It would improve performance of shared cards decryption because now all stage keys need to be collected from players in strict order. If we have N players, then we have N envelopes on each portion of shared cards. To remove first envelope we need to wait till 1st player sends us their stage key, and we can't remove second envelope while we're waiting for them.

* Shared cards revealing issue: if a player doesn't want to continue current round, or they folded and want to spoil the game for the rest, they could erase their stage keys for undealt shared cards. E.g. Alice was given 🂲🂧, she bets _pre-flop_ to see first portion of cards, she was not satisfied with _flop_, folds and erases stage keys for _turn_ and _river_. Now, the rest of players can't reveal _turn_ cards and continue playing. As a solution, reputation system might be helpful for preventing abandoned games.

* Decrypted cards each stage are being recorded into the blockchain. This is redundant, more optimal would be to just store revealed stage keys and players would decrypt cards at client side.

## Miscellaneous notes

* For a game with just 2 players, 9 random cards are generated.
