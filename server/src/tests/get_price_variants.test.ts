
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable, priceVariantsTable } from '../db/schema';
import { getPriceVariants } from '../handlers/get_price_variants';

describe('getPriceVariants', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty array when product has no price variants', async () => {
        // Create category first
        const categoryResult = await db.insert(categoriesTable)
            .values({
                name: 'Test Category',
                description: 'A test category'
            })
            .returning()
            .execute();

        // Create product without price variants
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Test Product',
                description: 'A test product',
                barcode: null,
                base_price: '10.00',
                stock_quantity: 50,
                category_id: categoryResult[0].id,
                is_active: true
            })
            .returning()
            .execute();

        const result = await getPriceVariants({ product_id: productResult[0].id });

        expect(result).toEqual([]);
    });

    it('should return price variants for a product', async () => {
        // Create category first
        const categoryResult = await db.insert(categoriesTable)
            .values({
                name: 'Test Category',
                description: 'A test category'
            })
            .returning()
            .execute();

        // Create product
        const productResult = await db.insert(productsTable)
            .values({
                name: 'Test Product',
                description: 'A test product',
                barcode: null,
                base_price: '10.00',
                stock_quantity: 50,
                category_id: categoryResult[0].id,
                is_active: true
            })
            .returning()
            .execute();

        // Create price variants
        const variantResults = await db.insert(priceVariantsTable)
            .values([
                {
                    product_id: productResult[0].id,
                    variant_name: 'Small',
                    price: '8.50',
                    is_default: true
                },
                {
                    product_id: productResult[0].id,
                    variant_name: 'Large',
                    price: '12.99',
                    is_default: false
                }
            ])
            .returning()
            .execute();

        const result = await getPriceVariants({ product_id: productResult[0].id });

        expect(result).toHaveLength(2);
        
        // Check first variant
        const smallVariant = result.find(v => v.variant_name === 'Small');
        expect(smallVariant).toBeDefined();
        expect(smallVariant!.product_id).toEqual(productResult[0].id);
        expect(smallVariant!.price).toEqual(8.50);
        expect(typeof smallVariant!.price).toBe('number');
        expect(smallVariant!.is_default).toBe(true);
        expect(smallVariant!.created_at).toBeInstanceOf(Date);

        // Check second variant
        const largeVariant = result.find(v => v.variant_name === 'Large');
        expect(largeVariant).toBeDefined();
        expect(largeVariant!.product_id).toEqual(productResult[0].id);
        expect(largeVariant!.price).toEqual(12.99);
        expect(typeof largeVariant!.price).toBe('number');
        expect(largeVariant!.is_default).toBe(false);
        expect(largeVariant!.created_at).toBeInstanceOf(Date);
    });

    it('should return only variants for the specified product', async () => {
        // Create category first
        const categoryResult = await db.insert(categoriesTable)
            .values({
                name: 'Test Category',
                description: 'A test category'
            })
            .returning()
            .execute();

        // Create two products
        const productResults = await db.insert(productsTable)
            .values([
                {
                    name: 'Product 1',
                    description: 'First product',
                    barcode: null,
                    base_price: '10.00',
                    stock_quantity: 50,
                    category_id: categoryResult[0].id,
                    is_active: true
                },
                {
                    name: 'Product 2',
                    description: 'Second product',
                    barcode: null,
                    base_price: '15.00',
                    stock_quantity: 30,
                    category_id: categoryResult[0].id,
                    is_active: true
                }
            ])
            .returning()
            .execute();

        // Create price variants for both products
        await db.insert(priceVariantsTable)
            .values([
                {
                    product_id: productResults[0].id,
                    variant_name: 'Small',
                    price: '8.50',
                    is_default: true
                },
                {
                    product_id: productResults[1].id,
                    variant_name: 'Medium',
                    price: '13.50',
                    is_default: true
                },
                {
                    product_id: productResults[0].id,
                    variant_name: 'Large',
                    price: '12.99',
                    is_default: false
                }
            ])
            .returning()
            .execute();

        const result = await getPriceVariants({ product_id: productResults[0].id });

        expect(result).toHaveLength(2);
        expect(result.every(variant => variant.product_id === productResults[0].id)).toBe(true);
        
        const variantNames = result.map(v => v.variant_name).sort();
        expect(variantNames).toEqual(['Large', 'Small']);
    });
});
