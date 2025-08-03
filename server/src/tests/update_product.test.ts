
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput, type CreateCategoryInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProductId: number;
  let testCategoryId: number;

  beforeEach(async () => {
    // Create test category directly
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test product directly
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        description: 'Original description',
        barcode: 'ORIG123',
        base_price: '10.99',
        stock_quantity: 50,
        category_id: testCategoryId,
        is_active: true
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  it('should update all product fields', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Updated Product',
      description: 'Updated description',
      barcode: 'UPD123',
      base_price: 15.99,
      stock_quantity: 75,
      category_id: testCategoryId,
      is_active: false
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(testProductId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.barcode).toEqual('UPD123');
    expect(result.base_price).toEqual(15.99);
    expect(typeof result.base_price).toEqual('number');
    expect(result.stock_quantity).toEqual(75);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Partially Updated',
      base_price: 12.50
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('Partially Updated');
    expect(result.base_price).toEqual(12.50);
    // Other fields should remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.barcode).toEqual('ORIG123');
    expect(result.stock_quantity).toEqual(50);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.is_active).toEqual(true);
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      description: null,
      barcode: null,
      category_id: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.category_id).toBeNull();
    // Other fields should remain unchanged
    expect(result.name).toEqual('Original Product');
    expect(result.base_price).toEqual(10.99);
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Database Test Product',
      base_price: 20.00
    };

    await updateProduct(updateInput);

    // Query database directly to verify changes
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].base_price)).toEqual(20.00);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original product to compare timestamps
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();

    const originalUpdatedAt = originalProduct[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProductInput = {
      id: testProductId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(updateProduct(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle foreign key constraint for category_id', async () => {
    const updateInput: UpdateProductInput = {
      id: testProductId,
      category_id: 99999 // Non-existent category
    };

    expect(updateProduct(updateInput)).rejects.toThrow();
  });
});
