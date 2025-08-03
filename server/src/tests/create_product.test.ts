
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Simple test input with all required fields
  const testInput: CreateProductInput = {
    name: 'Test Product',
    description: 'A product for testing',
    barcode: '1234567890',
    base_price: 19.99,
    stock_quantity: 100,
    category_id: null,
    is_active: true
  };

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.barcode).toEqual('1234567890');
    expect(result.base_price).toEqual(19.99);
    expect(typeof result.base_price).toEqual('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.category_id).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].description).toEqual('A product for testing');
    expect(products[0].barcode).toEqual('1234567890');
    expect(parseFloat(products[0].base_price)).toEqual(19.99);
    expect(products[0].stock_quantity).toEqual(100);
    expect(products[0].category_id).toBeNull();
    expect(products[0].is_active).toBe(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create product with category reference', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    const inputWithCategory: CreateProductInput = {
      ...testInput,
      category_id: categoryId
    };

    const result = await createProduct(inputWithCategory);

    expect(result.category_id).toEqual(categoryId);

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products[0].category_id).toEqual(categoryId);
  });

  it('should create product with minimal fields', async () => {
    const minimalInput: CreateProductInput = {
      name: 'Minimal Product',
      description: null,
      barcode: null,
      base_price: 9.99,
      stock_quantity: 0,
      category_id: null,
      is_active: true
    };

    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.barcode).toBeNull();
    expect(result.base_price).toEqual(9.99);
    expect(result.stock_quantity).toEqual(0);
    expect(result.category_id).toBeNull();
    expect(result.is_active).toBe(true);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      ...testInput,
      base_price: 15.47 // Test precision handling with 2 decimal places
    };

    const result = await createProduct(decimalInput);

    expect(result.base_price).toEqual(15.47);
    expect(typeof result.base_price).toEqual('number');

    // Verify database storage and retrieval
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].base_price)).toEqual(15.47);
  });
});
