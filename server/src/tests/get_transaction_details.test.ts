
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable, priceVariantsTable, transactionsTable, transactionItemsTable, paymentRecordsTable } from '../db/schema';
import { getTransactionDetails } from '../handlers/get_transaction_details';

describe('getTransactionDetails', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return null for non-existent transaction', async () => {
        const result = await getTransactionDetails({ id: 999 });
        expect(result).toBeNull();
    });

    it('should return transaction details with items and payments', async () => {
        // Create category
        const categoryResult = await db.insert(categoriesTable)
            .values({ name: 'Test Category', description: 'Test description' })
            .returning()
            .execute();
        const category = categoryResult[0];

        // Create product
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Test Product',
                description: 'Test product description',
                barcode: '123456789',
                base_price: '10.00',
                stock_quantity: 100,
                category_id: category.id,
                is_active: true
            })
            .returning()
            .execute();
        const product = productResult[0];

        // Create price variant
        const variantResult = await db.insert(priceVariantsTable)
            .values({
                product_id: product.id,
                variant_name: 'Large',
                price: '15.00',
                is_default: false
            })
            .returning()
            .execute();
        const variant = variantResult[0];

        // Create transaction
        const transactionResult = await db.insert(transactionsTable)
            .values({
                transaction_number: 'TXN-001',
                total_amount: '30.00',
                tax_amount: '2.70',
                discount_amount: '1.00',
                final_amount: '31.70',
                payment_method: 'cash',
                payment_status: 'completed'
            })
            .returning()
            .execute();
        const transaction = transactionResult[0];

        // Create transaction items
        await db.insert(transactionItemsTable)
            .values([
                {
                    transaction_id: transaction.id,
                    product_id: product.id,
                    price_variant_id: variant.id,
                    quantity: 2,
                    unit_price: '15.00',
                    total_price: '30.00',
                    discount_amount: '1.00'
                }
            ])
            .execute();

        // Create payment records
        await db.insert(paymentRecordsTable)
            .values([
                {
                    transaction_id: transaction.id,
                    payment_method: 'cash',
                    amount: '31.70',
                    reference_number: null
                }
            ])
            .execute();

        const result = await getTransactionDetails({ id: transaction.id });

        expect(result).not.toBeNull();
        expect(result!.id).toEqual(transaction.id);
        expect(result!.transaction_number).toEqual('TXN-001');
        expect(result!.total_amount).toEqual(30.00);
        expect(result!.tax_amount).toEqual(2.70);
        expect(result!.discount_amount).toEqual(1.00);
        expect(result!.final_amount).toEqual(31.70);
        expect(result!.payment_method).toEqual('cash');
        expect(result!.payment_status).toEqual('completed');

        // Check items
        expect(result!.items).toHaveLength(1);
        const item = result!.items[0];
        expect(item.product_id).toEqual(product.id);
        expect(item.price_variant_id).toEqual(variant.id);
        expect(item.quantity).toEqual(2);
        expect(item.unit_price).toEqual(15.00);
        expect(item.total_price).toEqual(30.00);
        expect(item.discount_amount).toEqual(1.00);
        expect(item.product_name).toEqual('Test Product');
        expect(item.variant_name).toEqual('Large');

        // Check payments
        expect(result!.payments).toHaveLength(1);
        const payment = result!.payments[0];
        expect(payment.payment_method).toEqual('cash');
        expect(payment.amount).toEqual(31.70);
        expect(payment.reference_number).toBeNull();
    });

    it('should handle transaction with no price variant', async () => {
        // Create product without category
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Simple Product',
                description: null,
                barcode: null,
                base_price: '5.00',
                stock_quantity: 50,
                category_id: null,
                is_active: true
            })
            .returning()
            .execute();
        const product = productResult[0];

        // Create transaction
        const transactionResult = await db.insert(transactionsTable)
            .values({
                transaction_number: 'TXN-002',
                total_amount: '5.00',
                tax_amount: '0.00',
                discount_amount: '0.00',
                final_amount: '5.00',
                payment_method: 'card',
                payment_status: 'completed'
            })
            .returning()
            .execute();
        const transaction = transactionResult[0];

        // Create transaction item without price variant
        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction.id,
                product_id: product.id,
                price_variant_id: null,
                quantity: 1,
                unit_price: '5.00',
                total_price: '5.00',
                discount_amount: '0.00'
            })
            .execute();

        // Create payment record
        await db.insert(paymentRecordsTable)
            .values({
                transaction_id: transaction.id,
                payment_method: 'card',
                amount: '5.00',
                reference_number: 'REF-123'
            })
            .execute();

        const result = await getTransactionDetails({ id: transaction.id });

        expect(result).not.toBeNull();
        expect(result!.items).toHaveLength(1);
        
        const item = result!.items[0];
        expect(item.price_variant_id).toBeNull();
        expect(item.variant_name).toBeUndefined();
        expect(item.product_name).toEqual('Simple Product');

        expect(result!.payments).toHaveLength(1);
        expect(result!.payments[0].reference_number).toEqual('REF-123');
    });

    it('should handle transaction with multiple items and payments', async () => {
        // Create products
        const product1Result = await db.insert(productsTable)
            .values({
                name: 'Product 1',
                description: null,
                barcode: null,
                base_price: '10.00',
                stock_quantity: 100,
                category_id: null,
                is_active: true
            })
            .returning()
            .execute();
        const product1 = product1Result[0];

        const product2Result = await db.insert(productsTable)
            .values({
                name: 'Product 2',
                description: null,
                barcode: null,
                base_price: '20.00',
                stock_quantity: 50,
                category_id: null,
                is_active: true
            })
            .returning()
            .execute();
        const product2 = product2Result[0];

        // Create transaction
        const transactionResult = await db.insert(transactionsTable)
            .values({
                transaction_number: 'TXN-003',
                total_amount: '30.00',
                tax_amount: '0.00',
                discount_amount: '0.00',
                final_amount: '30.00',
                payment_method: 'mixed',
                payment_status: 'completed'
            })
            .returning()
            .execute();
        const transaction = transactionResult[0];

        // Create multiple transaction items
        await db.insert(transactionItemsTable)
            .values([
                {
                    transaction_id: transaction.id,
                    product_id: product1.id,
                    price_variant_id: null,
                    quantity: 1,
                    unit_price: '10.00',
                    total_price: '10.00',
                    discount_amount: '0.00'
                },
                {
                    transaction_id: transaction.id,
                    product_id: product2.id,
                    price_variant_id: null,
                    quantity: 1,
                    unit_price: '20.00',
                    total_price: '20.00',
                    discount_amount: '0.00'
                }
            ])
            .execute();

        // Create multiple payment records
        await db.insert(paymentRecordsTable)
            .values([
                {
                    transaction_id: transaction.id,
                    payment_method: 'cash',
                    amount: '15.00',
                    reference_number: null
                },
                {
                    transaction_id: transaction.id,
                    payment_method: 'card',
                    amount: '15.00',
                    reference_number: 'CARD-456'
                }
            ])
            .execute();

        const result = await getTransactionDetails({ id: transaction.id });

        expect(result).not.toBeNull();
        expect(result!.payment_method).toEqual('mixed');
        
        // Check multiple items
        expect(result!.items).toHaveLength(2);
        const itemNames = result!.items.map(item => item.product_name);
        expect(itemNames).toContain('Product 1');
        expect(itemNames).toContain('Product 2');

        // Check multiple payments
        expect(result!.payments).toHaveLength(2);
        const paymentMethods = result!.payments.map(payment => payment.payment_method);
        expect(paymentMethods).toContain('cash');
        expect(paymentMethods).toContain('card');
        
        const totalPaymentAmount = result!.payments.reduce((sum, payment) => sum + payment.amount, 0);
        expect(totalPaymentAmount).toEqual(30.00);
    });
});
