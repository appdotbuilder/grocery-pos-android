
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { z } from 'zod';
import { and, gte, lte, desc, type SQL } from 'drizzle-orm';

const getTransactionsInputSchema = z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0)
});

type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const getTransactions = async (input: GetTransactionsInput): Promise<Transaction[]> => {
    try {
        // Build conditions array for date filtering
        const conditions: SQL<unknown>[] = [];

        if (input.start_date) {
            const startDate = new Date(input.start_date);
            conditions.push(gte(transactionsTable.transaction_date, startDate));
        }

        if (input.end_date) {
            const endDate = new Date(input.end_date);
            conditions.push(lte(transactionsTable.transaction_date, endDate));
        }

        // Build the complete query
        const baseQuery = db.select().from(transactionsTable);
        
        const results = await (conditions.length > 0 
            ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
            : baseQuery
        )
            .orderBy(desc(transactionsTable.transaction_date))
            .limit(input.limit)
            .offset(input.offset)
            .execute();

        // Convert numeric fields back to numbers
        return results.map(transaction => ({
            ...transaction,
            total_amount: parseFloat(transaction.total_amount),
            tax_amount: parseFloat(transaction.tax_amount),
            discount_amount: parseFloat(transaction.discount_amount),
            final_amount: parseFloat(transaction.final_amount)
        }));
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        throw error;
    }
};
