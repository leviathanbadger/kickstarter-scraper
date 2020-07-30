import axios from 'axios';
import createHttpsProxyAgent = require('https-proxy-agent');
import * as domino from 'domino';
import { pledgeConfig, PledgeConfig } from './config';

const SLEEP_MILLIS=1000*60*3; // Every three minutes
const BACKOFF_SLEEP_MILLIS=1000*60*15; // Every fifteen minutes

const proxyUsername = process.env.PROXY_USERNAME;
const proxyPassword = process.env.PROXY_PASSWORD;
const proxyHost = process.env.PROXY_HOST;
const proxyPort = process.env.PROXY_PORT;
const proxyAxios = axios.create({
    proxy: false,
    httpsAgent: createHttpsProxyAgent(`http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`)
});

function delay(millis: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, millis);
    });
}

async function sendMessage(message: string) {
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

async function checkPledgeAvailability(config: PledgeConfig): Promise<boolean> {
    try {
        console.log('Attempting to fetch pledge information...');
        let result = await proxyAxios.get(config.projectHref);
        console.log('Done.');
        let window = domino.createWindow(result.data);
        let document = window.document;
        let availablePledges = [...document.querySelectorAll('.sticky-rewards .mobile-hide ol > .pledge--available')]
                                    .map(el => el.getAttribute('data-reward-id'));
        return config.pledges.some(pledge => availablePledges.indexOf(pledge) !== -1);
    }
    catch (e) {
        console.error(e);
        await sendMessage('Failed to fetch pledge information. Check logs, might have hit ratelimiter.');
        await delay(BACKOFF_SLEEP_MILLIS);
        return false;
    }
}

async function sendAvailabilityNotification(config: PledgeConfig, isAvailable: boolean): Promise<void> {
    let message = isAvailable ? `Pledge available! GO GET IT! ${config.projectHref}` : 'Whoops, too late. Try again later.';
    await sendMessage(message);
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
