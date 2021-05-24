import rp from 'request-promise'

type KeyData = {
    success: boolean,
    record: {
        key: string,
        owner: string,
        limit: number,
        queriesInPastMin: number,
        totalQueries: number
    }
}

export type Player = {
    name: string,
    uuid: string
}

export type Profile = {
    name: string,
    members: Player[],
    uuid: string
}

export enum TransactionType {
    Deposit,
    Withdraw,
    Interest
}

function parseTransactionType(type: string): TransactionType {
    switch(type) {
        case 'WITHDRAW':
            return TransactionType.Withdraw
        case 'DEPOSIT':
            return TransactionType.Deposit
        default:
            return TransactionType.Interest
    }
}

export type Transaction = {
    type: TransactionType,
    amount: number,
    timestamp: Date,
    initiator: Player
}

export default class HypixelApi {
    private endpoint = 'https://api.hypixel.net'
    
    private uuid: string = null

    private constructor(private key: string) {}

    public static async create(key: string): Promise<HypixelApi> {
        const self = new HypixelApi(key)

        try {
            const keyData = await self.getKeyData()
            self.uuid = keyData.record.owner

            return self
        } catch {
            throw new Error('Couldn\'t verify api key')
        }
    }

    public async getKeyData(): Promise<KeyData> {
        return JSON.parse(await rp(this.endpoint + '/key', {
            headers: {
                'API-Key': this.key
            }
        }))
    }

    public async getProfiles(): Promise<Profile[]> {
        const response = JSON.parse(await rp(this.endpoint + '/skyblock/profiles?uuid=' + this.uuid, {
            headers: {
                'API-Key': this.key
            }
        }))

        const profiles: Profile[] = []

        for(let i = 0; i < response.profiles.length; i++) {
            const profile = response.profiles[i]

            const members: Player[] = []
            for(let uuid in profile['members']) {
                const names = JSON.parse(await rp(`https://api.mojang.com/user/profiles/${uuid}/names`))
                const name = names[names.length - 1].name
                members.push({
                    name: name,
                    uuid: uuid
                })
            }

            profiles.push({
                name: profile['cute_name'],
                members: members,
                uuid: profile['profile_id']
            })
        }

        return profiles
    }

    public async getTransactions(profile: Profile): Promise<Transaction[]> {
        const response = JSON.parse(await rp(this.endpoint + '/skyblock/profiles?uuid=' + this.uuid, {
            headers: {
                'API-Key': this.key
            }
        }))

        const p = response.profiles.filter(p => p['profile_id'] === profile.uuid)[0]

        const transactions: Transaction[] = []
        p.banking.transactions.forEach(transaction => {
            transactions.push({
                amount: transaction.amount,
                timestamp: new Date(transaction.timestamp),
                type: parseTransactionType(transaction.action),
                initiator: profile.members.filter(m => transaction['initiator_name'].endsWith(m.name))[0]
            })
        })

        return transactions
    }
}