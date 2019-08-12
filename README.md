# Blockchain Poker

This a proof-of-concept of cryptographically protected Poker game based on Substrate framework.\
Currently, only 1-on-1 game ("heads up") is implemented and there are still some bugs, mostly at the UI side.

## Quick start

To run the game you have to:

* Go to `node` directory, build the project and run it.

* Then go to `ui` directory, install dependencies with `yarn install` and run the UI with `yarn run dev`.\
  Just open `localhost:8000` in browser for every player and log-in with an development account.

Enjoy!

## Features

### Encryption of player's cards

All hidden cards are encrypted to avoid obtaining them by a player which is not authorized to see them; and all dealt cards are staying in the blockchain for possibility to verify that winner is determined fair and no cards replacement happened after they are dealt.

I use the following scheme for handling private player's cards (a `hand`):

* In the beginning of every round, a player generates a new key pair and registers a public key from it into the blockchain.

* Blockchain node generates random cards for players, encrypts private cards with corresponding public key and puts them into the blockchain.

* In this scenario, revealing of the cards is the same as a submitting your own private key for this round into the blockchain.

  If you chose to reveal cards, then your cards combination becomes public and verifiable as long as the blockchain exists.

  If you don't want to reveal cards (according to poker rules), then your secret key for this round is erased and nobody will know what cards you had without spending a lot of processing power.

### Atomic dealing of shared cards

Since we use blockchain as a state storage and it is public, then we can't store a state of cards deck in it. But we have to account already dealt cards when we randomly choose new ones from the deck. I apply the following technique for achieving this:

* In the beginning of every round, a player generates additional 3 key pairs for every stage of shared cards (`flop`, `turn` and `river`) and registers public keys in the blockchain.

* Instead of 4 moments in time when cards a dealt (`preflop`, `flop`, `turn` and `river`), which would require storing state of cards deck, the node deals cards in one go.

* After cards generation (9 of them for a game with 2 players), the node encrypts every stage with corresponding public key of _every_ player in the game. For 2 players, player's key is used first, then dealer's one is applied.

* When players made their bets and are ready to receive new shared cards, they submit their private keys of the next stage. I.e. if players are going to receive first 3 of shared cards, they submit their `flop` private key; for the last shared card they submit their `river` private key.

* In current implementation, the node waits while private keys of the desired stage from all players are received. Then it decrypts the stage with them in backward sequence to the encryption (first decrypt with dealer's key, then with player's one).

  Technically, it is possible to immediately remove one layer of encryption as soon as we receive dealer's key and save some time, but for simplicity this is not performed in the current version.

* Decrypted cards of next stage are being recorded into the blockchain and players see them.

For better performance, this atomic dealing should use _commutative_ encryption, which allows to remove 1 layer of encryption immediately after receiving a private key from any player in any order.

## Limitations of the current version

* Only 2 players in a game, only 1 game at the same moment.

* Encryption is implemented with naive RSA implementation without non-determinism.\
  It must be replaced with _off-chain_ encryption, provided by Substrate framework, when it will be released.\
  Currently, it is not secure at all. 64-bit keys are used.

* Block hashes and submitted public keys are used as a seed for a randomizer.\
  This also must be changed to use _off-chain_ random number generation.\
  Currently, it is not really random.

  And cards with nominals `A`,`2` and `3` are 6.25% more frequent\
  due to conversion of a 4-bit number into a nominal.

* Commutative encryption should be used in future versions.
