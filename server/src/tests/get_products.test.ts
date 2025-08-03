
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'First test product',
          barcode: 'TEST001',
          base_price: '19.99',
          stock_quantity: 100,
          category_id: categoryId,
          is_active: true
        },
        {
          name: 'Product 2',
          description: 'Second test product',
          barcode: 'TEST002',
          base_price: '29.99',
          stock_quantity: 50,
          category_id: categoryId,
          is_active: false
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify first product
    const product1 = result.find(p => p.name === 'Product 1');
    expect(product1).toBeDefined();
    expect(product1!.description).toEqual('First test product');
    expect(product1!.barcode).toEqual('TEST001');
    expect(product1!.base_price).toEqual(19.99);
    expect(typeof product1!.base_price).toEqual('number');
    expect(product1!.stock_quantity).toEqual(100);
    expect(product1!.category_id).toEqual(categoryId);
    expect(product1!.is_active).toEqual(true);
    expect(product1!.id).toBeDefined();
    expect(product1!.created_at).toBeInstanceOf(Date);
    expect(product1!.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const product2 = result.find(p => p.name === 'Product 2');
    expect(product2).toBeDefined();
    expect(product2!.description).toEqual('Second test product');
    expect(product2!.barcode).toEqual('TEST002');
    expect(product2!.base_price).toEqual(29.99);
    expect(typeof product2!.base_price).toEqual('number');
    expect(product2!.stock_quantity).toEqual(50);
    expect(product2!.category_id).toEqual(categoryId);
    expect(product2!.is_active).toEqual(false);
    expect(product2!.id).toBeDefined();
    expect(product2!.created_at).toBeInstanceOf(Date);
    expect(product2!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle products with null values correctly', async () => {
    // Create product with null fields
    await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        description: null,
        barcode: null,
        base_price: '15.50',
        stock_quantity: 25,
        category_id: null,
        is_active: true
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Minimal Product');
    expect(result[0].description).toBeNull();
    expect(result[0].barcode).toBeNull();
    expect(result[0].base_price).toEqual(15.50);
    expect(typeof result[0].base_price).toEqual('number');
    expect(result[0].stock_quantity).toEqual(25);
    expect(result[0].category_id).toBeNull();
    expect(result[0].is_active).toEqual(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});
