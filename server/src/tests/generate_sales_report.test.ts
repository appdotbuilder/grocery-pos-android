
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable, transactionsTable, transactionItemsTable, paymentRecordsTable } from '../db/schema';
import { type SalesReportInput } from '../schema';
import { generateSalesReport } from '../handlers/generate_sales_report';

describe('generateSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const setupTestData = async () => {
    // Create category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category'
      })
      .returning()
      .execute();

    // Create products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          description: 'First product',
          barcode: 'A001',
          base_price: '10.00',
          stock_quantity: 100,
          category_id: category[0].id,
          is_active: true
        },
        {
          name: 'Product B',
          description: 'Second product',
          barcode: 'B001',
          base_price: '20.00',
          stock_quantity: 50,
          category_id: category[0].id,
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create transactions
    const baseDate = new Date('2024-01-15T10:00:00Z');
    const transactions = await db.insert(transactionsTable)
      .values([
        {
          transaction_number: 'TXN001',
          total_amount: '30.00',
          tax_amount: '3.00',
          discount_amount: '2.00',
          final_amount: '31.00',
          payment_method: 'cash',
          payment_status: 'completed',
          transaction_date: baseDate
        },
        {
          transaction_number: 'TXN002',
          total_amount: '40.00',
          tax_amount: '4.00',
          discount_amount: '0.00',
          final_amount: '44.00',
          payment_method: 'card',
          payment_status: 'completed',
          transaction_date: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) // Next day
        },
        {
          transaction_number: 'TXN003',
          total_amount: '15.00',
          tax_amount: '1.50',
          discount_amount: '1.00',
          final_amount: '15.50',
          payment_method: 'cash',
          payment_status: 'cancelled', // This should be excluded
          transaction_date: baseDate
        }
      ])
      .returning()
      .execute();

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactions[0].id,
          product_id: products[0].id,
          price_variant_id: null,
          quantity: 2,
          unit_price: '10.00',
          total_price: '20.00',
          discount_amount: '1.00'
        },
        {
          transaction_id: transactions[0].id,
          product_id: products[1].id,
          price_variant_id: null,
          quantity: 1,
          unit_price: '20.00',
          total_price: '20.00',
          discount_amount: '1.00'
        },
        {
          transaction_id: transactions[1].id,
          product_id: products[0].id,
          price_variant_id: null,
          quantity: 3,
          unit_price: '10.00',
          total_price: '30.00',
          discount_amount: '0.00'
        },
        {
          transaction_id: transactions[1].id,
          product_id: products[1].id,
          price_variant_id: null,
          quantity: 1,
          unit_price: '20.00',
          total_price: '20.00',
          discount_amount: '0.00'
        },
        {
          transaction_id: transactions[2].id, // Cancelled transaction - should be excluded
          product_id: products[0].id,
          price_variant_id: null,
          quantity: 1,
          unit_price: '10.00',
          total_price: '10.00',
          discount_amount: '0.00'
        }
      ])
      .execute();

    return { category, products, transactions };
  };

  it('should generate comprehensive sales report', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2024-01-16T23:59:59Z',
      report_type: 'daily'
    };

    const result = await generateSalesReport(input);

    // Verify overall metrics (only completed transactions)
    expect(result.total_transactions).toEqual(2);
    expect(result.total_revenue).toEqual(75.00); // 31.00 + 44.00
    expect(result.total_items_sold).toEqual(7); // 2+1+3+1 (excluding cancelled)
    expect(result.average_transaction_value).toEqual(37.50); // 75.00 / 2

    // Verify top products
    expect(result.top_products).toHaveLength(2);
    expect(result.top_products[0].product_name).toEqual('Product A');
    expect(result.top_products[0].quantity_sold).toEqual(5); // 2+3
    expect(result.top_products[0].revenue).toEqual(50.00); // 20.00+30.00

    expect(result.top_products[1].product_name).toEqual('Product B');
    expect(result.top_products[1].quantity_sold).toEqual(2); // 1+1
    expect(result.top_products[1].revenue).toEqual(40.00); // 20.00+20.00

    // Verify daily breakdown
    expect(result.daily_breakdown).toHaveLength(2);
    expect(result.daily_breakdown[0].date).toEqual('2024-01-15');
    expect(result.daily_breakdown[0].transactions).toEqual(1);
    expect(result.daily_breakdown[0].revenue).toEqual(31.00);

    expect(result.daily_breakdown[1].date).toEqual('2024-01-16');
    expect(result.daily_breakdown[1].transactions).toEqual(1);
    expect(result.daily_breakdown[1].revenue).toEqual(44.00);
  });

  it('should handle empty date range', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-10T23:59:59Z',
      report_type: 'daily'
    };

    const result = await generateSalesReport(input);

    expect(result.total_transactions).toEqual(0);
    expect(result.total_revenue).toEqual(0);
    expect(result.total_items_sold).toEqual(0);
    expect(result.average_transaction_value).toEqual(0);
    expect(result.top_products).toHaveLength(0);
    expect(result.daily_breakdown).toHaveLength(0);
  });

  it('should exclude cancelled transactions', async () => {
    const { transactions } = await setupTestData();

    // Add more cancelled transactions
    await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN004',
        total_amount: '100.00',
        tax_amount: '10.00',
        discount_amount: '5.00',
        final_amount: '105.00',
        payment_method: 'card',
        payment_status: 'cancelled',
        transaction_date: new Date('2024-01-15T12:00:00Z')
      })
      .execute();

    const input: SalesReportInput = {
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2024-01-16T23:59:59Z',
      report_type: 'daily'
    };

    const result = await generateSalesReport(input);

    // Should still only count completed transactions
    expect(result.total_transactions).toEqual(2);
    expect(result.total_revenue).toEqual(75.00);
  });

  it('should handle single day date range', async () => {
    await setupTestData();

    const input: SalesReportInput = {
      start_date: '2024-01-15T00:00:00Z',
      end_date: '2024-01-15T23:59:59Z',
      report_type: 'daily'
    };

    const result = await generateSalesReport(input);

    expect(result.total_transactions).toEqual(1);
    expect(result.total_revenue).toEqual(31.00);
    expect(result.daily_breakdown).toHaveLength(1);
    expect(result.daily_breakdown[0].date).toEqual('2024-01-15');
  });
});
