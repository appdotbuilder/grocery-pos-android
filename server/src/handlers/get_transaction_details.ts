
import { db } from '../db';
import { transactionsTable, transactionItemsTable, paymentRecordsTable, productsTable, priceVariantsTable } from '../db/schema';
import { type Transaction, type TransactionItem, type PaymentRecord } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getTransactionDetailsInputSchema = z.object({
    id: z.number()
});

type GetTransactionDetailsInput = z.infer<typeof getTransactionDetailsInputSchema>;

type TransactionDetails = Transaction & {
    items: (TransactionItem & { product_name: string; variant_name?: string })[];
    payments: PaymentRecord[];
};

export const getTransactionDetails = async (input: GetTransactionDetailsInput): Promise<TransactionDetails | null> => {
    try {
        // First, get the transaction
        const transactionResult = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.id, input.id))
            .execute();

        if (transactionResult.length === 0) {
            return null;
        }

        const transactionData = transactionResult[0];

        // Convert numeric fields to numbers
        const transaction: Transaction = {
            ...transactionData,
            total_amount: parseFloat(transactionData.total_amount),
            tax_amount: parseFloat(transactionData.tax_amount),
            discount_amount: parseFloat(transactionData.discount_amount),
            final_amount: parseFloat(transactionData.final_amount)
        };

        // Get transaction items with product and variant details
        const itemsResult = await db.select()
            .from(transactionItemsTable)
            .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
            .leftJoin(priceVariantsTable, eq(transactionItemsTable.price_variant_id, priceVariantsTable.id))
            .where(eq(transactionItemsTable.transaction_id, input.id))
            .execute();

        const items = itemsResult.map(result => ({
            id: result.transaction_items.id,
            transaction_id: result.transaction_items.transaction_id,
            product_id: result.transaction_items.product_id,
            price_variant_id: result.transaction_items.price_variant_id,
            quantity: result.transaction_items.quantity,
            unit_price: parseFloat(result.transaction_items.unit_price),
            total_price: parseFloat(result.transaction_items.total_price),
            discount_amount: parseFloat(result.transaction_items.discount_amount),
            product_name: result.products.name,
            variant_name: result.price_variants?.variant_name || undefined
        }));

        // Get payment records
        const paymentsResult = await db.select()
            .from(paymentRecordsTable)
            .where(eq(paymentRecordsTable.transaction_id, input.id))
            .execute();

        const payments: PaymentRecord[] = paymentsResult.map(payment => ({
            ...payment,
            amount: parseFloat(payment.amount)
        }));

        return {
            ...transaction,
            items,
            payments
        };
    } catch (error) {
        console.error('Get transaction details failed:', error);
        throw error;
    }
};
