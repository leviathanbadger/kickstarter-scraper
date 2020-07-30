import axios from 'axios';
import * as domino from 'domino';
import { pledgeConfig, PledgeConfig } from './config';

const SLEEP_MILLIS=1000*60*5; // Every five minutes

function delay(millis: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, millis);
    });
}

async function checkPledgeAvailability(config: PledgeConfig): Promise<boolean> {
    try {
        let result = await axios.get(config.projectHref);
        let window = domino.createWindow(result.data);
        let document = window.document;
        let availablePledges = [...document.querySelectorAll('.sticky-rewards .mobile-hide ol > .pledge--available')]
                                    .map(el => el.getAttribute('data-reward-id'));
        return config.pledges.some(pledge => availablePledges.indexOf(pledge) !== -1);
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

async function sendAvailabilityNotification(config: PledgeConfig, isAvailable: boolean): Promise<void> {
    let message = isAvailable ? `Pledge available! GO GET IT! ${config.projectHref}` : 'Whoops, too late. Try again later.';
    console.log(message);

    let slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) return;
    try {
        await axios.post(slackWebhookUrl, { text: message });
    }
    catch (e) {
        console.error('Failed to send message via slack.');
        console.error(e);
    }
}

async function main() {
    let hadAvailablePledge = false;

    while (true) {
        let hasAvailablePledge = await checkPledgeAvailability(pledgeConfig);
        if (hasAvailablePledge !== hadAvailablePledge) {
            await sendAvailabilityNotification(pledgeConfig, hasAvailablePledge);
        }
        hadAvailablePledge = hasAvailablePledge;
        await delay(SLEEP_MILLIS);
    }
}

main();
