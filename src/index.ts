import axios from 'axios';
import createHttpsProxyAgent = require('https-proxy-agent');
import * as domino from 'domino';
import { pledgeConfig, PledgeConfig } from './config';

const SLEEP_MILLIS = 1000*60*3; // Every three minutes
const PLEDGE_SLEEP_MILLIS = 1000*60*3; // Every minute
const BACKOFF_SLEEP_ADD = [0, 1000*60*2, 1000*60*7, 1000*60*12, 1000*60*27, 1000*60*57]; // Backoff to three, five, ten, fifteen, thirty, sixty minutes

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

async function checkPledgeAvailability(config: PledgeConfig): Promise<string[] | null> {
    try {
        console.log('Attempting to fetch pledge information...');
        let result = await proxyAxios.get(config.projectHref);
        console.log('Done.');
        let window = domino.createWindow(result.data);
        let document = window.document;
        let availablePledges = [...document.querySelectorAll('.sticky-rewards .mobile-hide ol > .pledge--available')]
                                    .map(el => ({
                                        id: el.getAttribute('data-reward-id')!,
                                        name: el.querySelector('.pledge__info .pledge__title')?.textContent?.trim() || '(unknown)'
                                    }));
        return availablePledges
            .filter(availablePledge => config.pledges.indexOf(availablePledge.id) !== -1)
            .map(availablePledge => availablePledge.name);
    }
    catch (e) {
        console.error(e);
        await sendMessage('Failed to fetch pledge information. Check logs, might have hit ratelimiter.');
        return null;
    }
}

async function sendAvailabilityNotification(config: PledgeConfig, availablePledges: string[]): Promise<void> {
    let message: string;
    if (!availablePledges.length) message = 'Whoops, too late. Try again later.';
    else if (availablePledges.length === 1) message = `Pledge available! "${availablePledges[0]}". GO GET IT! ${config.projectHref}`;
    else message = `Pledges available! ${availablePledges.map(name => `"${name}"`).join(', ')}. GO GET ONE! ${config.projectHref}`;
    await sendMessage(message);
}

function areArraysSameIgnoringOrder<T>(one: T[] | null, two: T[] | null) {
    if (!!one !== !!two) return false;
    if (!one || !two) return true;
    if (one.length !== two.length) return false;
    for (let val of one) {
        if (two.indexOf(val) === -1) return false;
    }
    return true;
}

async function main() {
    await sendMessage('Starting scraper.');

    let previouslyAvailablePledges: string[] = [];
    let backoffIndex = 0;

    while (true) {
        let availablePledges = await checkPledgeAvailability(pledgeConfig);
        if (availablePledges) {
            if (!areArraysSameIgnoringOrder(availablePledges, previouslyAvailablePledges)) {
                await sendAvailabilityNotification(pledgeConfig, availablePledges);
            }
            previouslyAvailablePledges = availablePledges;
            backoffIndex = 0;
            await delay(!!availablePledges.length ? PLEDGE_SLEEP_MILLIS : SLEEP_MILLIS);
        }
        else {
            backoffIndex++;
            let sleepTime = SLEEP_MILLIS + BACKOFF_SLEEP_ADD[backoffIndex >= BACKOFF_SLEEP_ADD.length ? BACKOFF_SLEEP_ADD.length - 1 : backoffIndex];
            await delay(sleepTime);
        }
    }
}

process.on('SIGINT', async function() {
    console.info('Handling SIGINT. Stopping scraper.');
    await sendMessage('Stopping scraper.');
    process.exit();
});

main().catch(err => {
    console.error(err);
    sendMessage('Fatal error, uncought. Aborting scraper. Check logs.');
});
