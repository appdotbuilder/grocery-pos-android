
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { getProductByBarcode } from '../handlers/get_product_by_barcode';

describe('getProductByBarcode', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should find product by barcode', async () => {
        // Create category first
        const categoryResult = await db.insert(categoriesTable)
            .values({
                name: 'Test Category',
                description: 'Category for testing'
            })
            .returning()
            .execute();

        // Create product with barcode
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Test Product',
                description: 'Product with barcode',
                barcode: '1234567890123',
                base_price: '19.99',
                stock_quantity: 100,
                category_id: categoryResult[0].id,
                is_active: true
            })
            .returning()
            .execute();

        const result = await getProductByBarcode({ barcode: '1234567890123' });

        expect(result).toBeDefined();
        expect(result!.id).toEqual(productResult[0].id);
        expect(result!.name).toEqual('Test Product');
        expect(result!.barcode).toEqual('1234567890123');
        expect(result!.base_price).toEqual(19.99);
        expect(typeof result!.base_price).toEqual('number');
        expect(result!.stock_quantity).toEqual(100);
        expect(result!.is_active).toEqual(true);
        expect(result!.created_at).toBeInstanceOf(Date);
        expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent barcode', async () => {
        const result = await getProductByBarcode({ barcode: 'non-existent-barcode' });

        expect(result).toBeNull();
    });

    it('should return null for empty barcode results', async () => {
        // Create product without barcode
        await db.insert(productsTable)
            .values({
                name: 'Product Without Barcode',
                description: 'No barcode here',
                barcode: null,
                base_price: '9.99',
                stock_quantity: 50,
                category_id: null,
                is_active: true
            })
            .returning()
            .execute();

        const result = await getProductByBarcode({ barcode: 'missing-barcode' });

        expect(result).toBeNull();
    });

    it('should find product with null category', async () => {
        // Create product without category
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Product Without Category',
                description: 'Product without category',
                barcode: '9999999999999',
                base_price: '5.50',
                stock_quantity: 25,
                category_id: null,
                is_active: true
            })
            .returning()
            .execute();

        const result = await getProductByBarcode({ barcode: '9999999999999' });

        expect(result).toBeDefined();
        expect(result!.id).toEqual(productResult[0].id);
        expect(result!.name).toEqual('Product Without Category');
        expect(result!.category_id).toBeNull();
        expect(result!.base_price).toEqual(5.50);
    });

    it('should find inactive product by barcode', async () => {
        // Create inactive product
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Inactive Product',
                description: 'This product is inactive',
                barcode: '5555555555555',
                base_price: '12.00',
                stock_quantity: 0,
                category_id: null,
                is_active: false
            })
            .returning()
            .execute();

        const result = await getProductByBarcode({ barcode: '5555555555555' });

        expect(result).toBeDefined();
        expect(result!.id).toEqual(productResult[0].id);
        expect(result!.is_active).toEqual(false);
        expect(result!.stock_quantity).toEqual(0);
    });
});
