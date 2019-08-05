const { ApiPromise } = require('@polkadot/api');
import { NotificationManager } from 'react-notifications';
const bufEq = require('arraybuffer-equal');

async function main () {
    // Create our API with a default connection to the local node
    const api = await ApiPromise.create();
    const decoder = new TextDecoder("utf-8");

    // subscribe to system events via storage
    api.query.system.events((events) => {
        // loop through the Vec<EventRecord>
        events.forEach((record) => {
            // extract the phase, event and the event types
            const { event, phase } = record;
            const types = event.typeDef;

            if (event.section === 'poker') {
                if (event.method === "Announcement") {
                    let message = decoder.decode(event.data[0]);
                    NotificationManager.warning(message, "", 3000);
                } else if (event.method === "ErrorMessage") {
                    performIfAddressedForUs(event, data => {
                        let message = decoder.decode(data[1]);
                        NotificationManager.error(message, "", 3000);
                    });
                } else if (event.method === "InfoMessage") {
                    performIfAddressedForUs(event, data => {
                        let message = decoder.decode(data[1]);
                        NotificationManager.info(message, "", 1000);
                    });
                } else if (event.method === "NewParticipant") {
                    let buyIn = event.data[1];
                    NotificationManager.success(`${name(event)} took a seat with ${buyIn} chips`, "", 2000);
                } else if (event.method === "NewDealer") {
                    NotificationManager.info(`${name(event)} becomes new dealer`, "", 2000);
                } else if (event.method === "ParticipantLeft") {
                    NotificationManager.warning(`${name(event)} left the game`, "", 3000);
                } else if (event.method === "AllIn") {
                    NotificationManager.warning(`${name(event)} goes all-in!`, "", 3000);
                } else if (event.method === "Raise") {
                    let diff = event.data[1];
                    NotificationManager.warning(`${name(event)} bets ${diff} more`, "", 2000);
                } else if (event.method === "Call") {
                    NotificationManager.info(`${name(event)} calls the bet`, "", 1000);
                } else if (event.method === "Check") {
                    NotificationManager.info(`${name(event)} checks`, "", 1000);
                } else if (event.method === "Fold") {
                    NotificationManager.warning(`${name(event)} folds`, "", 2000);
                } else if (event.method === "BetsAreMade") {
                    NotificationManager.info("proceeding to the next stage", "Bets are made", 3000);
                } else {
                    NotificationManager.info(`${event.method}: ${event.data}`);
                }
            }
        });
    });
}

function performIfAddressedForUs(event, callback) {
    game.user.then(user => {
        if (event.data[0] == null || event.data[0].value.buffer == undefined
                || bufEq(user.buffer, event.data[0].value.buffer)) {
            callback(event.data);
        }
    });
}

function name(event) {
    return game.accounts.find(event.data[0]).name;
}

main().catch((error) => {
    console.error(error);
    process.exit(-1);
});
