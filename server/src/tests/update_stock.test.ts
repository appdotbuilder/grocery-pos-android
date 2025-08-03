
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { updateStock } from '../handlers/update_stock';
import { eq } from 'drizzle-orm';

describe('updateStock', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testProductId: number;

    beforeEach(async () => {
        // Create a test category first
        const categoryResult = await db.insert(categoriesTable)
            .values({
                name: 'Test Category',
                description: 'Category for testing'
            })
            .returning()
            .execute();

        // Create a test product with initial stock
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Test Product',
                description: 'Product for testing',
                barcode: 'TEST123',
                base_price: '10.99',
                stock_quantity: 50,
                category_id: categoryResult[0].id,
                is_active: true
            })
            .returning()
            .execute();

        testProductId = productResult[0].id;
    });

    it('should add stock quantity', async () => {
        const result = await updateStock({
            product_id: testProductId,
            quantity_change: 25,
            operation: 'add'
        });

        expect(result.success).toBe(true);
        expect(result.new_quantity).toBe(75);

        // Verify in database
        const products = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        expect(products[0].stock_quantity).toBe(75);
    });

    it('should subtract stock quantity', async () => {
        const result = await updateStock({
            product_id: testProductId,
            quantity_change: 20,
            operation: 'subtract'
        });

        expect(result.success).toBe(true);
        expect(result.new_quantity).toBe(30);

        // Verify in database
        const products = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        expect(products[0].stock_quantity).toBe(30);
    });

    it('should set stock quantity', async () => {
        const result = await updateStock({
            product_id: testProductId,
            quantity_change: 100,
            operation: 'set'
        });

        expect(result.success).toBe(true);
        expect(result.new_quantity).toBe(100);

        // Verify in database
        const products = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        expect(products[0].stock_quantity).toBe(100);
    });

    it('should throw error for non-existent product', async () => {
        expect(updateStock({
            product_id: 99999,
            quantity_change: 10,
            operation: 'add'
        })).rejects.toThrow(/not found/i);
    });

    it('should throw error when subtraction would result in negative stock', async () => {
        expect(updateStock({
            product_id: testProductId,
            quantity_change: 60, // Current stock is 50
            operation: 'subtract'
        })).rejects.toThrow(/negative stock/i);
    });

    it('should throw error when setting negative stock', async () => {
        expect(updateStock({
            product_id: testProductId,
            quantity_change: -10,
            operation: 'set'
        })).rejects.toThrow(/negative stock/i);
    });

    it('should allow setting stock to zero', async () => {
        const result = await updateStock({
            product_id: testProductId,
            quantity_change: 0,
            operation: 'set'
        });

        expect(result.success).toBe(true);
        expect(result.new_quantity).toBe(0);

        // Verify in database
        const products = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        expect(products[0].stock_quantity).toBe(0);
    });

    it('should update the updated_at timestamp', async () => {
        // Get initial timestamp
        const initialProducts = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        const initialTimestamp = initialProducts[0].updated_at;

        // Wait a moment to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        await updateStock({
            product_id: testProductId,
            quantity_change: 10,
            operation: 'add'
        });

        // Check updated timestamp
        const updatedProducts = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, testProductId))
            .execute();

        const updatedTimestamp = updatedProducts[0].updated_at;
        expect(updatedTimestamp > initialTimestamp).toBe(true);
    });
});
