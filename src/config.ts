

export type PledgeConfig = {
    projectHref: string,
    pledges: string[]
};

export const pledgeConfig: PledgeConfig = {
    projectHref: 'https://www.kickstarter.com/projects/dragonsteel/the-way-of-kings-10th-anniversary-leatherbound-edition',
    pledges: [
        // '0', // No reward
        // '7606118', //Digital novella ($10)
        // '7792466', //Physical novella ($50)
        '7792476', //2020 Signed leatherbound only ($200)
        '7797498', //2020 Signed leatherbound w/ swag ($200)
        '7792510', //2020 Signed leatherbound plus ($250)
        '7670216', //2020 Signed and numbered leatherbound ($500)
        // '7807176', //2021 Signed leatherbound only ($200)
        // '7807150', //2021 Signed leatherbound w/ swag ($200)
        '7807143', //2021 Signed leatherbound plus ($250)
        // '7806779', //2021 Signed and numbered leatherbound ($500)
        // '7806882' //2021 Signed and NOT numbered leatherbound ($500)
    ]
};
