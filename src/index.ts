import { Client } from "discord.js";
import BankingWrapper from "./lib/BankingWrapper";
import HypixelApi, { Player, Profile } from "./lib/HypixelApi";
import fs from 'fs'
import path from 'path'
import { Config } from "./cli/generateConfig";
import 'colors'

const config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), {
    encoding: 'utf-8'
}))

let banking: BankingWrapper
let profile: Profile
(async () => {
    const api = await HypixelApi.create(config.apiKey)
    banking = new BankingWrapper(api)

    const profiles = await api.getProfiles()
    profile = profiles.filter(p => p.uuid === config.profileUuid)[0]
    if(!profile) {
        console.log('Profile from config.json doesn\'t exist'.red)
        process.exit(0)
    }

    console.log('Monitoring the following members')
    console.log(profile.members)

    setInterval(async () => {
        const newTransactions = await banking.newTransactions(profile)
        if(newTransactions.length > 0) {
            console.log('\n'.repeat(5))
            console.log('The following new transactions were made')
            console.log(newTransactions)

            console.log('Resulting in the following new balances')
            for(const [player, balance] of banking.balance.entries()) {
                console.log(`${player.name}: ${balance}`)
            }
        }
    }, 5000)
})()

const client = new Client()

client.on('ready', () => {
    console.log('Bot ready')
})

client.on('message', msg => {
    const prefix = 'bb'

    if(!msg.content.startsWith(prefix)) return
    const args = msg.content.slice(prefix.length).trim().split(' ').map(p => p = p.trim())
    const command = args.shift()

    if(!banking) {
        return msg.channel.send('Bot is not ready to be used yet')
    }

    if(command === 'balance') {
        const id = msg.mentions.members.first()?.id || msg.author.id

        if(!profile.members[id]) {
            console.log(`No matching Skyblock profile member for Discord id{${id}}`.red)
            return msg.channel.send(`id{${id}} is not connected to this bot`)
        }
        return msg.channel.send(`You have ${banking.getBalance(profile.members.find(m => m.uuid === config.discordMappings[id])[0])}`)
    }
})

client.login(config.discordToken)