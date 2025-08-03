
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete a product by setting is_active to false', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();

    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        barcode: '123456789',
        base_price: '19.99',
        stock_quantity: 100,
        category_id: categoryResult[0].id,
        is_active: true
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct({ id: productId });

    expect(result.success).toBe(true);

    // Verify product is soft deleted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].is_active).toBe(false);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteProduct({ id: nonExistentId }))
      .rejects.toThrow(/Product with id 999 not found/i);
  });

  it('should update the updated_at timestamp', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();

    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        barcode: '123456789',
        base_price: '19.99',
        stock_quantity: 100,
        category_id: categoryResult[0].id,
        is_active: true
      })
      .returning()
      .execute();

    const originalUpdatedAt = productResult[0].updated_at;
    const productId = productResult[0].id;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete the product
    await deleteProduct({ id: productId });

    // Verify updated_at timestamp was changed
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(updatedProduct[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle already soft deleted product', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();

    // Create a test product that's already inactive
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        barcode: '123456789',
        base_price: '19.99',
        stock_quantity: 100,
        category_id: categoryResult[0].id,
        is_active: false
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the already inactive product
    const result = await deleteProduct({ id: productId });

    expect(result.success).toBe(true);

    // Verify product is still inactive
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].is_active).toBe(false);
  });
});
