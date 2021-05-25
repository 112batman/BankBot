import HypixelApi, {Transaction, Profile, Player, TransactionType} from "./HypixelApi";
import db from 'quick.db'
import fs from 'fs'
import path from 'path'
import { Config } from "../cli/generateConfig";

const config: Config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), {
    encoding: 'utf-8'
}))

export default class BankingWrapper {
    private oldTransactions: Transaction[] = null

    public readonly balance: Map<Player, number> = new Map()

    constructor(private api: HypixelApi) {}

    public async newTransactions(profile: Profile): Promise<Transaction[]> {
        const transactions = await this.api.getTransactions(profile)

        const newTransactions: Transaction[] = []
        if(this.oldTransactions) { // Ignore transactions pre-monitoring
            for(let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i]
    
                if(this.oldTransactions.filter(t => t.timestamp.getTime() === transaction.timestamp.getTime() && t?.initiator?.uuid === transaction?.initiator?.uuid).length < 1) newTransactions.push(transaction)
            }
        }

        this.oldTransactions = transactions

        this.doUpdate(newTransactions)

        return newTransactions
    }

    private requestStartingBalance(uuid: string) {
        if(db.has(uuid)) return db.get(uuid)

        if(config.startingBalance[uuid]) return config.startingBalance[uuid]
        console.log(`No starting balance specified in config.json for uuid{${uuid}}, assuming 0`.red)
        return 0
    }

    private updateBalance(player: Player, amount: number) {
        if(player === undefined) { // Interest?
            return
        }

        if(this.balance.has(player)) {
            this.balance.set(player, this.balance.get(player) + amount)
        }else {
            this.balance.set(player, this.requestStartingBalance(player.uuid) + amount)
        }

        db.set(player.uuid, this.balance.get(player))
    }

    private doUpdate(newTransactions: Transaction[]) {
        newTransactions.forEach(transaction => {
            switch(transaction.type) {
                case TransactionType.Deposit:
                    this.updateBalance(transaction.initiator, transaction.amount)
                    break
                case TransactionType.Withdraw:
                    this.updateBalance(transaction.initiator, -1 * transaction.amount)
                    break
                default:
                    break
            }
        })
    }

    public getBalance(player: Player): number {
        if(this.balance.has(player)) {
            return this.balance.get(player)
        }else {
            this.updateBalance(player, 0)
            return this.balance.get(player)
        }
    }
}