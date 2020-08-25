import fs from 'fs';
import csvParse from 'csv-parse';
import { getCustomRepository, getRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filepath: string;
}

interface CSVTransaction {
  title: string;
  type: 'outcome' | 'income';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filepath }: Request): Promise<Transaction[]> {
    // TODO
    const transactionsReadStream = fs.createReadStream(filepath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = transactionsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async csvRow => {
      const [title, type, value, category] = csvRow.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      const categoryExists = categories.find(
        categoryName => categoryName === category,
      );

      if (!categoryExists) {
        categories.push(category);
      }

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const addCategoryTitles = categories.filter(
      category => !existentCategoriesTitles.includes(category),
    );

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filepath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
