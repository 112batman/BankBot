import { Client } from "discord.js";
import BankingWrapper from "./lib/BankingWrapper";
import HypixelApi, { Player } from "./lib/HypixelApi";

const mappings: Map<string, Player> = new Map();

let banking: BankingWrapper
(async () => {
    const api = await HypixelApi.create('f1fa25ef-1da0-4df6-9d06-264f2159c2c0')
    banking = new BankingWrapper(api)

    const profiles = await api.getProfiles()
    const profile = profiles[1]

    profile.members.forEach(member => {
        switch(member.uuid) {
            case '58c4e7abfd9a456d998122207fa0bb4a': // Stan
                mappings.set('686904489206087718', member)
                break
            case 'ed165a011e5447e692956e203a4d28eb': // Finn
                mappings.set('519513599094292481', member)
                break
            case '5bdf56c1d67149a4ab8ef024edb5d3d4': // Twan
                mappings.set('684059935633440800', member)
                break
            case 'b66e2dc51af04022b2a98c4c50b27d6a': // Jouke
                mappings.set('684673272033312811', member)
                break
            case '060a1447dc174543a14d83403e55b7aa': // Tijn
                mappings.set('464287642356285442', member)
                break
            default:
                break
        }
    })

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
        return msg.channel.send(`You have ${banking.getBalance(mappings.get(msg.author.id))}`)
    }
})

client.login('ODQ2NDE3MDM3MDc2ODU2ODc0.YKvNSw.ds-0vIvm7xIQENKBTkj_-m9yN1M')