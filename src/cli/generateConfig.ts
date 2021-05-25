import ora from 'ora'
import prompts, { Choice } from 'prompts'
import 'colors'
import HypixelApi, { Profile } from '../lib/HypixelApi'
import fs from 'fs'
import path from 'path'

export type Config = {
    discordToken: string,
    apiKey: string,
    profileUuid: string,
    startingBalance: {
        [memberUuid: string]: number
    },
    discordMappings: {
        [discordId: string]: string
    },
    updateInterval: number
}

(async () => {
    const discordToken = (await prompts({
        type: 'text',
        message: 'What is your Discord bot token?',
        name: 'value'
    })).value

    const apiKey = (await prompts({
        type: 'text',
        message: 'What is your Hypixel API key?',
        name: 'value'
    })).value

    const requestProfiles = ora('Requesting profiles').start()

    const api = await HypixelApi.create(apiKey).catch(() => {
        console.log('Invalid API key'.red)
        process.exit(0)
    })

    const profiles = await api.getProfiles()

    requestProfiles.succeed()

    const profile: Profile = (await prompts({
        type: 'select',
        message: 'What profile do you want to monitor?',
        name: 'value',
        choices: profiles.map(p => p = <any> <Choice> {
            title: p.name,
            value: p,
        })
    })).value

    if(profile.members.length < 2) {
        console.log('This is only available for coop profiles'.red)
        process.exit(0)
    }

    const isCorrectProfile = (await prompts({
        type: 'confirm',
        message: 'Do you want to monitor the following profile?' + `\n${' '.repeat(4)}` + `Members: ${profile.members.map(m => m = <any> m.name).join(', ')}`.dim,
        name: 'value'
    })).value

    if(!isCorrectProfile) {
        console.log('Please start setup again and select the correct profile'.red)
        process.exit(0)
    }

    const hasStartingMoney = (await prompts({
        type: 'confirm',
        message: 'Do any of the profile members already have money in the coop bank?',
        name: 'value'
    })).value

    const startingBalance: {
        [memberUuid: string]: number
    } = {}

    if(hasStartingMoney) {
        for(let i = 0; i < profile.members.length; i++) {
            const member = profile.members[i]

            const balance = (await prompts({
                type: 'number',
                message: `How much money does ${member.name} have in the coop bank?`,
                name: 'value'
            })).value

            startingBalance[member.uuid] = balance
        }
    }else {
        profile.members.forEach(member => {
            startingBalance[member.uuid] = 0
        })
    }

    const discordMappings: {
        [discordId: string]: string
    } = {}

    for(let i = 0; i < profile.members.length; i++) {
        const member = profile.members[i]

        const discordId = (await prompts({
            type: 'text',
            message: `What is the Discord user ID of ${member.name}?`,
            name: 'value'
        })).value

        discordMappings[discordId] = member.uuid
    }

    const updateInterval = (await prompts({
        type: 'number',
        message: 'Every how many seconds should the bot update (recommended not to set lower then 1)',
        name: 'value',
        initial: 5
    })).value;

    (() => {
        const config: Config = {
            discordToken: discordToken,
            apiKey: apiKey,
            profileUuid: profile.uuid,
            startingBalance: startingBalance,
            discordMappings: discordMappings,
            updateInterval: updateInterval
        }

        fs.writeFileSync(path.join(__dirname, '..', '..', 'config.json'), JSON.stringify(config, null, 4))

        console.log('Wrote config to config.json'.green)
        process.exit(0)
    })()
})()