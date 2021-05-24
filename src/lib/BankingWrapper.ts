import HypixelApi, {Transaction, Profile, Player, TransactionType} from "./HypixelApi";
import db from 'quick.db'

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

        switch(uuid) {
            case '58c4e7abfd9a456d998122207fa0bb4a': // Stan
                return 59000000
            case '5bdf56c1d67149a4ab8ef024edb5d3d4': // Twan
                return 5000000
            case '060a1447dc174543a14d83403e55b7aa': // Tijn
                return 18900000
            default:
                return 0
        }
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