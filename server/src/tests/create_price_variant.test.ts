
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { priceVariantsTable, productsTable, categoriesTable } from '../db/schema';
import { type CreatePriceVariantInput } from '../schema';
import { createPriceVariant } from '../handlers/create_price_variant';
import { eq } from 'drizzle-orm';

describe('createPriceVariant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let productId: number;

  beforeEach(async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    // Create a product for testing price variants
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        base_price: '19.99',
        stock_quantity: 100,
        category_id: categoryResult[0].id,
        is_active: true
      })
      .returning()
      .execute();

    productId = productResult[0].id;
  });

  const testInput: CreatePriceVariantInput = {
    product_id: 0, // Will be set dynamically
    variant_name: 'Large Size',
    price: 24.99,
    is_default: false
  };

  it('should create a price variant', async () => {
    const input = { ...testInput, product_id: productId };
    const result = await createPriceVariant(input);

    // Basic field validation
    expect(result.product_id).toEqual(productId);
    expect(result.variant_name).toEqual('Large Size');
    expect(result.price).toEqual(24.99);
    expect(typeof result.price).toBe('number');
    expect(result.is_default).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save price variant to database', async () => {
    const input = { ...testInput, product_id: productId };
    const result = await createPriceVariant(input);

    // Query using proper drizzle syntax
    const priceVariants = await db.select()
      .from(priceVariantsTable)
      .where(eq(priceVariantsTable.id, result.id))
      .execute();

    expect(priceVariants).toHaveLength(1);
    expect(priceVariants[0].product_id).toEqual(productId);
    expect(priceVariants[0].variant_name).toEqual('Large Size');
    expect(parseFloat(priceVariants[0].price)).toEqual(24.99);
    expect(priceVariants[0].is_default).toEqual(false);
    expect(priceVariants[0].created_at).toBeInstanceOf(Date);
  });

  it('should create default price variant', async () => {
    const input = {
      ...testInput,
      product_id: productId,
      variant_name: 'Regular Size',
      is_default: true
    };
    const result = await createPriceVariant(input);

    expect(result.is_default).toEqual(true);
    expect(result.variant_name).toEqual('Regular Size');
  });

  it('should handle price conversion correctly', async () => {
    const input = {
      ...testInput,
      product_id: productId,
      price: 15.50
    };
    const result = await createPriceVariant(input);

    expect(result.price).toEqual(15.50);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const saved = await db.select()
      .from(priceVariantsTable)
      .where(eq(priceVariantsTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].price)).toEqual(15.50);
  });

  it('should throw error for non-existent product', async () => {
    const input = {
      ...testInput,
      product_id: 999999 // Non-existent product ID
    };

    expect(createPriceVariant(input)).rejects.toThrow(/product with id 999999 not found/i);
  });

  it('should create multiple variants for same product', async () => {
    const smallVariant = {
      product_id: productId,
      variant_name: 'Small Size',
      price: 19.99,
      is_default: true
    };

    const largeVariant = {
      product_id: productId,
      variant_name: 'Large Size',
      price: 29.99,
      is_default: false
    };

    const small = await createPriceVariant(smallVariant);
    const large = await createPriceVariant(largeVariant);

    expect(small.product_id).toEqual(productId);
    expect(large.product_id).toEqual(productId);
    expect(small.variant_name).toEqual('Small Size');
    expect(large.variant_name).toEqual('Large Size');
    expect(small.is_default).toEqual(true);
    expect(large.is_default).toEqual(false);

    // Verify both exist in database
    const variants = await db.select()
      .from(priceVariantsTable)
      .where(eq(priceVariantsTable.product_id, productId))
      .execute();

    expect(variants).toHaveLength(2);
  });
});
