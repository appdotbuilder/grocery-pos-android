
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';

// Helper function to create test transaction
const createTestTransaction = async (overrides: Partial<any> = {}) => {
    const defaultTransaction = {
        transaction_number: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        total_amount: '100.00',
        tax_amount: '10.00',
        discount_amount: '5.00',
        final_amount: '105.00',
        payment_method: 'cash' as const,
        payment_status: 'completed' as const,
        ...overrides
    };

    const result = await db.insert(transactionsTable)
        .values(defaultTransaction)
        .returning()
        .execute();

    return result[0];
};

describe('getTransactions', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should fetch transactions with default pagination', async () => {
        // Create test transactions
        await createTestTransaction({ transaction_number: 'TXN-001' });
        await createTestTransaction({ transaction_number: 'TXN-002' });

        const result = await getTransactions({
            limit: 50,
            offset: 0
        });

        expect(result).toHaveLength(2);
        expect(result[0].transaction_number).toEqual('TXN-002'); // Most recent first
        expect(result[1].transaction_number).toEqual('TXN-001');
        
        // Verify numeric conversions
        expect(typeof result[0].total_amount).toBe('number');
        expect(typeof result[0].tax_amount).toBe('number');
        expect(typeof result[0].discount_amount).toBe('number');
        expect(typeof result[0].final_amount).toBe('number');
        
        expect(result[0].total_amount).toEqual(100.00);
        expect(result[0].tax_amount).toEqual(10.00);
        expect(result[0].discount_amount).toEqual(5.00);
        expect(result[0].final_amount).toEqual(105.00);
    });

    it('should apply date filtering correctly', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Create transaction from yesterday
        await createTestTransaction({
            transaction_number: 'TXN-OLD',
            transaction_date: yesterday
        });

        // Create transaction from today
        await createTestTransaction({
            transaction_number: 'TXN-TODAY'
        });

        // Filter for today only
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const result = await getTransactions({
            start_date: today.toISOString(),
            end_date: endOfToday.toISOString(),
            limit: 50,
            offset: 0
        });

        expect(result).toHaveLength(1);
        expect(result[0].transaction_number).toEqual('TXN-TODAY');
    });

    it('should handle pagination correctly', async () => {
        // Create 3 transactions
        await createTestTransaction({ transaction_number: 'TXN-001' });
        await createTestTransaction({ transaction_number: 'TXN-002' });
        await createTestTransaction({ transaction_number: 'TXN-003' });

        // Get first page
        const firstPage = await getTransactions({
            limit: 2,
            offset: 0
        });

        expect(firstPage).toHaveLength(2);
        expect(firstPage[0].transaction_number).toEqual('TXN-003'); // Most recent first

        // Get second page
        const secondPage = await getTransactions({
            limit: 2,
            offset: 2
        });

        expect(secondPage).toHaveLength(1);
        expect(secondPage[0].transaction_number).toEqual('TXN-001'); // Oldest
    });

    it('should return empty array when no transactions match filters', async () => {
        // Create transaction
        await createTestTransaction();

        // Filter for future date
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const result = await getTransactions({
            start_date: futureDate.toISOString(),
            limit: 50,
            offset: 0
        });

        expect(result).toHaveLength(0);
    });

    it('should handle different payment methods and statuses', async () => {
        await createTestTransaction({
            transaction_number: 'TXN-CASH',
            payment_method: 'cash',
            payment_status: 'completed'
        });

        await createTestTransaction({
            transaction_number: 'TXN-CARD',
            payment_method: 'card',
            payment_status: 'pending'
        });

        const result = await getTransactions({
            limit: 50,
            offset: 0
        });

        expect(result).toHaveLength(2);
        
        const cashTransaction = result.find(t => t.transaction_number === 'TXN-CASH');
        const cardTransaction = result.find(t => t.transaction_number === 'TXN-CARD');

        expect(cashTransaction?.payment_method).toEqual('cash');
        expect(cashTransaction?.payment_status).toEqual('completed');
        expect(cardTransaction?.payment_method).toEqual('card');
        expect(cardTransaction?.payment_status).toEqual('pending');
    });
});
