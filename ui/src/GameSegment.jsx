import React from 'react';

require('semantic-ui-css/semantic.min.css');

import { Icon, Label, Header, Segment, Button } from 'semantic-ui-react';
import { Bond } from 'oo7';
import { If, Rspan } from 'oo7-react';
import { SignerBond } from './AccountIdBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { BlinkingLabel } from './BlinkingLabel.jsx';
import { RaiseSelector } from './RaiseSelector.jsx';
import { NotificationContainer } from 'react-notifications';
import { Pretty } from './Pretty';
import { SvgRow } from './SvgRow';

import { calls, post, runtime } from 'oo7-substrate';
import {secretStore} from 'oo7-substrate/src/secretStore.js';

const bufEq = require('arraybuffer-equal');

import { decode, image, hidden } from './cards.js';
import { decrypt } from './naive_rsa.js';
import {BalanceBond} from "./BalanceBond";
const keys = require('./keys.js');
const stages = require('./stages.js');

function accountsAreEqualAndNotNull(left, right) {
    return left !== null && right !== null
        && bufEq(left.buffer, right.buffer);
}

function bondsAccountsAreEqualAndNotNull(left, right) {
    return left.map(d => right.map(u => accountsAreEqualAndNotNull(d, u)));
}

export class GameSegment extends React.Component {
    constructor (props) {
        super(props);
        window.game = this;
        this.accounts = secretStore();

        this.user = new Bond;
        this.isLoggedIn = (new Bond).default(false);
        this.isLoggedOut = this.isLoggedIn.map(flag => !flag);

        this.dealer = runtime.poker.dealer;
        this.player = runtime.poker.player;

        this.isDealer = bondsAccountsAreEqualAndNotNull(this.dealer, this.user);
        this.isPlayer = bondsAccountsAreEqualAndNotNull(this.player, this.user);

        this.opponent = this.isDealer.map(isDealer => {
            if (isDealer) {
                return this.player;
            } else {
                return this.dealer;
            }
        });

        this.dealerIsJoined = this.dealer.map(d => d !== null);
        this.playerIsJoined = this.player.map(p => p !== null);

        this.isJoined = this.isDealer.map(d =>
            this.isPlayer.map(p =>
                d || p));

        this.pocketCards = runtime.poker.pocketCards(game.user);
        this.opponentCards = this.opponent.map(runtime.poker.openCards);

        this.sharedCards = runtime.poker.sharedCards;
        this.stage = runtime.poker.stage;
        this.showdown = this.stage.map(stage => stage === stages.Showdown);

        this.raise = new Bond();
        this.betsAreMade = runtime.poker.betsNow.map(who => who === null);

        this.pocketCardsAreDealt = this.pocketCards.map(encrypted => encrypted.length !== 0);
        this.opponentCardsAreRevealed = this.opponentCards.map(encrypted => encrypted.length !== 0);

        this.isJoined.tie(joined => {
            this.isLoggedIn.then(logged => {
                if (joined && logged) { //joining a game while being logged in
                    this.pocketCardsAreDealt.then(dealt => {
                        console.log("Joining the game");
                        console.assert(!dealt);
                        this.requestPreflop();
                    });
                }
            });
        });

        this.isLoggedIn.tie(logged => {
            this.isJoined.then(joined => {
                if (joined && logged) { //logging in while being joined to a game
                    this.pocketCardsAreDealt.then(dealt => {
                        console.log("Resuming to the game");
                        if (dealt) {
                            keys.load();
                        } else {
                            this.requestPreflop();
                        }
                    });
                }
            });
        });

        this.betsAreMade.tie(playersAreReady => {
            if (playersAreReady) {
                this.requestNextStage();
            }
        });
    }

    logIn () {
        game.isLoggedIn.changed(true);
    }

    logOut () {
        game.isLoggedIn.changed(false);
    }

    logInKeyPressHandler (event) {
        if (event.key === "Enter" && game.user.isReady()) {
            game.logIn();
        }
    }

    requestPreflop () {
        keys.generate();
        game.opponent.tie((other, id) => {
            if (other !== null) {
                console.log("Requesting a new round");
                let tx = {
                    sender: this.user,
                    call: calls.poker.preflop(
                        keys.Pocket.map(key => key.modulus),
                        keys.Flop.map(key => key.modulus),
                        keys.Turn.map(key => key.modulus),
                        keys.River.map(key => key.modulus))
                };
                let status = post(tx);
                status.tie((s,id) => {
                    if (s.confirmed || s.scheduled) {
                        console.log("Request for a new round registered");
                        status.untie(id);
                    }
                });
                if (id) {
                    game.opponent.untie(id);
                }
            }
        });
    }

    requestNextStage () {
        let requested = this.stage.map(s => s + 1);
        let secret = requested.map(s => stages.secretFromStage(s));
        this.stage.then(current => {
            if (current >= stages.Preflop && current <= stages.River) {
                console.log("Requesting next stage, current: ", current);
                let tx = {
                    sender: this.user,
                    call: calls.poker.nextStage(requested, secret)
                };
                let status = post(tx);
                status.tie((s,id) => {
                    if (s.confirmed || s.scheduled) {
                        console.log("Request for a new stage registered");
                    }
                });
            }
        });
    }

    render () {
        return <Segment style={{ margin: '1em' }} padded>
            <Header as='h2'>
                <Icon name='send' />
                <Header.Content>
                    <table><tbody><tr>
                        <td width="400">
                            Blockchain Poker
                            <Header.Subheader>Play poker via blockchain</Header.Subheader>
                        </td><td>
                            <If condition={this.isLoggedIn} then={
                                <div style={{ paddingTop: '1em' }}>
                                    <Button onClick={this.logOut} content="Log out" icon="sign in" color="orange" />
                                </div>
                            }/>
                        </td>
                    </tr></tbody></table>
                </Header.Content>
            </Header>
            <div>
                <NotificationContainer/>
                {/* Logging in */}
                <If condition={this.isLoggedOut} then={<span>
                    <div style={{ fontSize: 'small' }}>Please input account information:</div>
                    <SignerBond bond={this.user} onKeyDown={this.logInKeyPressHandler}/>
					<div style={{ paddingTop: '1em' }}>
                        <If condition={this.user.ready()} then={
                            <Button onClick={this.logIn} content="Log in" icon="sign in" color="orange"/>
                        } else={
                            <Button content="Log in" icon="sign in" />
                        } />
					</div>
				</span>} />

				{/* User logged in */}
                <If condition={this.isLoggedIn} then={<span>
                    { this.displayAccountInfo() }

                    <If condition={this.dealerIsJoined} then={<div style={{ paddingTop: '1em' }}>
                        <table><tbody><tr>
                            <td>Blinds are </td>
                            <td><Label color="violet" size="large">
                                <Pretty value={runtime.poker.blinds.map(blinds =>
                                    `${blinds[0][0]}/${blinds[0][1]}`)
                                }/>
                            </Label></td>
                            <td> in this game</td>
                        </tr></tbody></table>

                        <If condition={this.pocketCardsAreDealt}
                            else={this.displayParticipant(this.dealer, false)}/>
                        <If condition={this.playerIsJoined} then={<div>
                            <If condition={this.pocketCardsAreDealt}
                                else={this.displayParticipant(this.player, false)}/>
                            <p />

                            <If condition={this.isJoined} then={
                                this.renderGameTable()
                            } else={
                                this.displayMessage("Sorry, at the moment here are only two chairs...")
                            }/>
                        </div>} else={
                            <If condition={this.isJoined} then={
                                this.renderWaitingSection()
                            } else={<span>
                                { this.displayMessage("One person is waiting at the table.") }
                                { this.renderJoinGameSection() }
                            </span>}/>
                        }/>
                    </div>} else={<span>
                        { this.displayMessage("There is nobody in the room.") }
                        { this.renderCreateGameSection() }
                    </span>}/>
				</span>} />
            </div>
        </Segment>
    }

    renderCreateGameSection () {
        let buyIn = new Bond;
        let blind = new Bond;

        return <div style={{ paddingTop: '1em' }}>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>minimal amount to bet</div>
                <BalanceBond bond={blind} />
            </div>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>amount to put on the table</div>
                <BalanceBond bond={buyIn} />
            </div>
            <div style={{ paddingTop: '1em' }}>
                <TransactButton tx={{
                    sender: this.user,
                    call: calls.poker.createGame(buyIn, blind),
                    compact: false,
                    longevity: true
                }} color="green" icon="sign in"
                   content="Create"/>
            </div>
        </div>;
    }

    renderWaitingSection () {
        return <div>
            { this.displayMessage("You are waiting at the table...") }
            <div style={{ paddingTop: '1em' }}>
                <TransactButton tx={{
                    sender: this.user,
                    call: calls.poker.leaveGame(),
                    compact: false,
                    longevity: true
                }} color="orange" icon="sign in"
                   content="Leave"/>
            </div>
        </div>;
    }

    renderJoinGameSection () {
        let buyIn = new Bond;

        return <div style={{ paddingTop: '1em' }}>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>amount to put on table</div>
                <BalanceBond bond={buyIn} />
            </div>
            <div style={{ paddingTop: '1em' }}>
                <TransactButton tx={{
                    sender: this.user,
                    call: calls.poker.joinGame(buyIn),
                    compact: false,
                    longevity: true
                }} color="green" icon="sign in"
                   content="Join"/>
            </div>
        </div>;
    }

    renderGameTable () {
        return <div style={{
            'width': '1282px',
            'height': '679px',
            'backgroundColor': 'green',
            'border': '10px solid darkgreen',
            'borderRadius': '20px',
            'paddingTop': '20px',
            'paddingLeft': '20px',
            'paddingRight': '20px',
            'paddingBottom': '20px',
        }}>
            <If condition={this.pocketCardsAreDealt} then={<span>
                {/*Players have received their pocket cards*/}
                <table><tbody><tr>
                        <td>
                            <table><tbody><tr><td>
                                { this.displayParticipant(this.opponent, true)}
                                { this.displayOpponentCards() }
                                { this.displayBet(this.opponent) }
                            </td></tr>
                            <tr height="30"><td></td></tr>
                            <tr><td>
                                { this.displayBet(this.user) }
                                { this.displayPocketCards() }
                                { this.displayParticipant(this.user, true)}
                            </td></tr></tbody></table>
                        </td>
                        <td>
                            <table><tbody><tr height="320"><td>
                                <div align="center">
                                    { this.displayPot() }
                                </div>
                                <div style={{
                                    'paddingLeft': '24px'}}>
                                    <div style={{
                                        'height': '265px',
                                        'width': '838px',
                                        'backgroundColor': 'forestgreen',
                                        'border': '6px solid greenyellow',
                                        'borderRadius': '12px',
                                        'paddingTop': '12px',
                                        'paddingLeft': '12px',
                                        'paddingRight': '12px',
                                        'paddingBottom': '12px',}}>
                                        <If condition={this.sharedCards.map(encoded => encoded.length > 0)}
                                            then={this.displaySharedCards()}/>
                                    </div>
                                </div>
                            </td></tr><tr><td>
                                <div align="center">
                                    <If condition={game.showdown}
                                        then={this.displayEndActions()}
                                        else={this.displayBetActionsWhenReady()}/>
                                </div>
                            </td></tr></tbody></table>
                        </td>
                </tr></tbody></table>
            </span>} else={<span>
                {/*Players haven't received cards yet*/}
                <div style={{ paddingBottom: '2em' }}>
                    {this.displayMessage("Good luck and have fun.")}
                </div>
                {this.displayStatus("Providing round keys and waiting for cards...")}
            </span>}/>
        </div>;
    }

    displayAccountInfo () {
        return <div>
            <Label>Logged in as
                <Label.Detail>
                    <Pretty value={this.user} />
                </Label.Detail>
            </Label>
            <Label>Balance
                <Label.Detail>
                    <Pretty value={runtime.balances.balance(this.user)} />
                </Label.Detail>
            </Label>
        </div>;
    }

    displayParticipantProperty(participant, callback) {
        return <Pretty value={participant.map(account => {
            if (account !== null) {
                return callback(account);
            }
            return "";
        })}/>;
    }

    displayParticipant (participant, markDealer) {
        let content = <span>
            <Label color="blue">
                { this.displayParticipantProperty(participant,
                    account => game.accounts.find(account).name) }
            </Label>
            <Label>
                { this.displayParticipantProperty(participant,
                    account => runtime.poker.stacks(account)) }
            </Label>
            <If condition={bondsAccountsAreEqualAndNotNull(participant, this.user)}
                then={<Label color="yellow">You</Label>}
                else={<Label color="yellow">Opponent</Label>}/>
        </span>;

        return <table><tbody>
            <If condition={markDealer} then={<tr>
                <td width="259px">{content}</td>
                <td>
                    <If condition={bondsAccountsAreEqualAndNotNull(participant, this.dealer)}
                        then={<Label color="red"><Pretty value="Dealer" /></Label>}/>
                </td>
            </tr>} else={<tr><td>
                {content}
            </td></tr>}/>
        </tbody></table>;
    }

    displayPocketCards () {
        //we change the source to open cards because after showdown it makes problems
        //when we are re-generating keys (at this moment cards are still encrypted with old key)
        return <If condition={this.showdown}
           then={SvgRow("pocket",
               runtime.poker.openCards(game.user).map(encoded => {
                   let cards = decode(encoded);
                   return cards.map(image)
               }))}
           else={SvgRow("pocket",
               this.pocketCards.map(encrypted =>
                   keys.Pocket.map(key => {
                       let decrypted = decrypt(encrypted, key.modulus, key.exponent);
                       let cards = decode(decrypted);
                       return cards.map(image);
                   })))}/>;
    }

    displayBet (participant) {
        let bet = runtime.poker.bets(participant);
        return <div align="center" style={{'height': '30px'}}>
            <If condition={bet.map(n => n.valueOf() !== 0)}
                then={<Label color="olive">Bet: <Pretty value={bet}/></Label>}/>
        </div>;
    }

    displayPot () {
        let pot = runtime.poker.pot;
        return <div style={{ paddingTop: '1em', paddingBottom: '1em' }}>
            <If condition={pot.map(n => n.valueOf() !== 0)}
                then={<Label size="huge" color="purple">Pot: <Pretty value={pot}/></Label>}/>
        </div>;
    }

    displayBetActionsWhenReady () {
        return <If condition={bondsAccountsAreEqualAndNotNull(runtime.poker.betsNow, game.user)}
            then={this.displayBetActions()}
            else={<Label color="blue" size="large">
                Waiting for your turn
            </Label>}/>;
    }

    displayBetActions () {
        //not only fun, but also notifies when the only option to raise is all-in
        let raiseLabel = game.raise.defaultTo(0).map(bet =>
            runtime.poker.stacks(game.user).map(stack => {
                if (stack.valueOf() === bet) {
                    return "All-in!";
                } else {
                    return "Raise";
                }
            }));

        let callLabel = runtime.poker.betLevel.defaultTo(0).map(level =>
            runtime.poker.stacks(game.user).map(stack => {
                if (stack.valueOf() <= level) {
                    return "All-in!";
                } else {
                    return "Call";
                }
            }));

        return <table><tbody>
            <tr><td>
                <TransactButton color="red" content="Leave" tx={{
                    sender: this.user,
                    call: calls.poker.leaveGameAnyway()
                }}/>
                <TransactButton color="red" content="Fold" tx={{
                    sender: this.user,
                    call: calls.poker.fold()
                }} size="massive"/>
                <TransactButton color="yellow" content={raiseLabel} tx={{
                    sender: this.user,
                    call: calls.poker.raise(game.raise)
                }} size="massive"/>
                <TransactButton color="green" content={callLabel} tx={{
                    sender: this.user,
                    call: calls.poker.call()
                }} size="massive"/>
                <TransactButton color="blue" content="Check" tx={{
                    sender: this.user,
                    call: calls.poker.check()
                }}/>
            </td></tr><tr><td>
                <Rspan className="value">{
                    runtime.poker.betLevel.map(level => {
                        return runtime.poker.blinds.map(blinds => {
                            return runtime.poker.stacks(game.user).map(stack => {
                                if (level >= stack) {
                                    game.raise.reset();
                                    return <span/>;
                                } else {
                                    let maxRaise = stack.valueOf();
                                    let minRaise = Math.min(maxRaise,
                                        level + Math.max(level, blinds[0][1]));
                                    return <RaiseSelector
                                        maxValue={maxRaise}
                                        minValue={minRaise}
                                        default={minRaise}
                                    />;
                                }
                    })})})
                }</Rspan>
            </td></tr>
        </tbody></table>;
    }

    displayEndActions () {
        return <div>
            <TransactButton content="Quit" color="red" tx={{
                sender: this.user,
                call: calls.poker.leaveGame()
            }}/>
            <Button content="One more!" icon="123" color="blue"
                    onClick={this.requestPreflop} />
        </div>
    }

    displayOpponentCards () {
        let hiddenCards = new Bond();
        hiddenCards.changed([...Array(2).keys()]
            .map(_ => hidden()));

        return <If condition={this.opponentCardsAreRevealed}
           then={SvgRow("opponent-revealed",
               this.opponentCards.map(encoded => decode(encoded).map(image)))}
           else={SvgRow("opponent-hidden", hiddenCards)}/>;
    }

    displaySharedCards () {
        return SvgRow("shared",
            this.sharedCards.map(encoded => {
                let cards = decode(encoded);
                return cards.map(image);
            })
        );
    }

    displayStatus (status) {
        return <div style={{ paddingTop: '1em', paddingBottom: '1em' }}>
            <BlinkingLabel size="massive" color="yellow">
                { status }
            </BlinkingLabel>
        </div>;
    }

    displayMessage (message) {
        return <div style={{ paddingTop: '1em' }}>
            <Label size="large" color="blue">
                { message }
            </Label>
        </div>;
    }

    displayGameResult () {
        return <Label>TODO: WINNER</Label>
    }
}

//todo: Try to use `bonds.me`, see this doc for details: https://wiki.parity.io/oo7-Parity-Examples
//todo: Implement codec for some structures. Though they are not actually used, they produce warnings.
//todo: Remove direct state mutation and use `setState()`!
//todo: implement `any` combinator for bonds, similar to `all`

// const {} = require('oo7-react');
// const {} = require('oo7-parity');
// const {AccountLabel} = require('parity-reactive-ui');