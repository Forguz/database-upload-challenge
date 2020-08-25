import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    // TODO
    const transactions = await this.find();

    const balancedTransaction = transactions.reduce(
      (balance, transaction) => {
        if (transaction.type === 'income') {
          balance.income += Number(transaction.value);
          balance.total += Number(transaction.value);
        }

        if (transaction.type === 'outcome') {
          balance.outcome += Number(transaction.value);
          balance.total -= Number(transaction.value);
        }

        return balance;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );

    return balancedTransaction;
  }
}

export default TransactionsRepository;
