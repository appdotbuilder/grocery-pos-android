
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, priceVariantsTable, transactionsTable, transactionItemsTable, paymentRecordsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transaction with single item and single payment', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    
    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        barcode: 'TEST123',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id,
        is_active: true
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: null,
        quantity: 2,
        discount_amount: 0
      }],
      tax_amount: 2.00,
      discount_amount: 0,
      payments: [{
        payment_method: 'cash',
        amount: 22.00,
        reference_number: null
      }]
    };

    const result = await createTransaction(testInput);

    // Verify transaction fields
    expect(result.id).toBeDefined();
    expect(result.transaction_number).toMatch(/^TXN-\d+-[a-z0-9]+$/);
    expect(result.total_amount).toEqual(20.00);
    expect(result.tax_amount).toEqual(2.00);
    expect(result.discount_amount).toEqual(0);
    expect(result.final_amount).toEqual(22.00);
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_status).toEqual('completed');
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create transaction with price variant', async () => {
    // Create test category and product
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category' })
      .returning()
      .execute();
    
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    
    // Create price variant
    const variantResult = await db.insert(priceVariantsTable)
      .values({
        product_id: productResult[0].id,
        variant_name: 'Large',
        price: '15.00',
        is_default: false
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: variantResult[0].id,
        quantity: 1,
        discount_amount: 0
      }],
      tax_amount: 0,
      discount_amount: 0,
      payments: [{
        payment_method: 'card',
        amount: 15.00,
        reference_number: 'CARD123'
      }]
    };

    const result = await createTransaction(testInput);

    expect(result.total_amount).toEqual(15.00);
    expect(result.final_amount).toEqual(15.00);
    expect(result.payment_method).toEqual('card');
  });

  it('should create transaction with mixed payments', async () => {
    // Create test data
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category' })
      .returning()
      .execute();
    
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: null,
        quantity: 3,
        discount_amount: 0
      }],
      tax_amount: 0,
      discount_amount: 5.00,
      payments: [
        {
          payment_method: 'cash',
          amount: 15.00,
          reference_number: null
        },
        {
          payment_method: 'card',
          amount: 10.00,
          reference_number: 'CARD456'
        }
      ]
    };

    const result = await createTransaction(testInput);

    expect(result.total_amount).toEqual(30.00);
    expect(result.discount_amount).toEqual(5.00);
    expect(result.final_amount).toEqual(25.00);
    expect(result.payment_method).toEqual('mixed');
  });

  it('should update product stock quantities', async () => {
    // Create test data
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category' })
      .returning()
      .execute();
    
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: null,
        quantity: 5,
        discount_amount: 0
      }],
      tax_amount: 0,
      discount_amount: 0,
      payments: [{
        payment_method: 'cash',
        amount: 50.00,
        reference_number: null
      }]
    };

    await createTransaction(testInput);

    // Check updated stock
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productResult[0].id))
      .execute();

    expect(updatedProduct[0].stock_quantity).toEqual(45);
  });

  it('should create transaction items and payment records', async () => {
    // Create test data
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category' })
      .returning()
      .execute();
    
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: null,
        quantity: 2,
        discount_amount: 1.00
      }],
      tax_amount: 0,
      discount_amount: 0,
      payments: [{
        payment_method: 'cash',
        amount: 19.00,
        reference_number: null
      }]
    };

    const result = await createTransaction(testInput);

    // Check transaction items
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(transactionItems).toHaveLength(1);
    expect(transactionItems[0].product_id).toEqual(productResult[0].id);
    expect(transactionItems[0].quantity).toEqual(2);
    expect(parseFloat(transactionItems[0].unit_price)).toEqual(10.00);
    expect(parseFloat(transactionItems[0].total_price)).toEqual(19.00);
    expect(parseFloat(transactionItems[0].discount_amount)).toEqual(1.00);

    // Check payment records
    const paymentRecords = await db.select()
      .from(paymentRecordsTable)
      .where(eq(paymentRecordsTable.transaction_id, result.id))
      .execute();

    expect(paymentRecords).toHaveLength(1);
    expect(paymentRecords[0].payment_method).toEqual('cash');
    expect(parseFloat(paymentRecords[0].amount)).toEqual(19.00);
  });

  it('should throw error for non-existent product', async () => {
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: 999,
        price_variant_id: null,
        quantity: 1,
        discount_amount: 0
      }],
      tax_amount: 0,
      discount_amount: 0,
      payments: [{
        payment_method: 'cash',
        amount: 10.00,
        reference_number: null
      }]
    };

    await expect(createTransaction(testInput)).rejects.toThrow(/Product with ID 999 not found/i);
  });

  it('should throw error when payment total does not match final amount', async () => {
    // Create test data
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category' })
      .returning()
      .execute();
    
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        base_price: '10.00',
        stock_quantity: 50,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    
    const testInput: CreateTransactionInput = {
      items: [{
        product_id: productResult[0].id,
        price_variant_id: null,
        quantity: 1,
        discount_amount: 0
      }],
      tax_amount: 0,
      discount_amount: 0,
      payments: [{
        payment_method: 'cash',
        amount: 5.00, // Incorrect amount
        reference_number: null
      }]
    };

    await expect(createTransaction(testInput)).rejects.toThrow(/Payment total.*does not match final amount/i);
  });
});
