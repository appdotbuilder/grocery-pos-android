
import { db } from '../db';
import { transactionsTable, transactionItemsTable, productsTable } from '../db/schema';
import { type SalesReportInput, type SalesReport } from '../schema';
import { eq, gte, lte, and, sum, count, desc, sql } from 'drizzle-orm';

export const generateSalesReport = async (input: SalesReportInput): Promise<SalesReport> => {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);

    // Get overall transaction statistics
    const transactionStats = await db
      .select({
        total_transactions: count(transactionsTable.id),
        total_revenue: sum(transactionsTable.final_amount),
        total_tax: sum(transactionsTable.tax_amount),
        total_discount: sum(transactionsTable.discount_amount)
      })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.transaction_date, startDate),
          lte(transactionsTable.transaction_date, endDate),
          eq(transactionsTable.payment_status, 'completed')
        )
      )
      .execute();

    // Get total items sold
    const itemStats = await db
      .select({
        total_items_sold: sum(transactionItemsTable.quantity)
      })
      .from(transactionItemsTable)
      .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
      .where(
        and(
          gte(transactionsTable.transaction_date, startDate),
          lte(transactionsTable.transaction_date, endDate),
          eq(transactionsTable.payment_status, 'completed')
        )
      )
      .execute();

    // Get top products
    const topProducts = await db
      .select({
        product_id: transactionItemsTable.product_id,
        product_name: productsTable.name,
        quantity_sold: sum(transactionItemsTable.quantity),
        revenue: sum(transactionItemsTable.total_price)
      })
      .from(transactionItemsTable)
      .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
      .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
      .where(
        and(
          gte(transactionsTable.transaction_date, startDate),
          lte(transactionsTable.transaction_date, endDate),
          eq(transactionsTable.payment_status, 'completed')
        )
      )
      .groupBy(transactionItemsTable.product_id, productsTable.name)
      .orderBy(desc(sum(transactionItemsTable.total_price)))
      .limit(10)
      .execute();

    // Get daily breakdown
    const dailyBreakdown = await db
      .select({
        date: sql<string>`DATE(${transactionsTable.transaction_date})`,
        transactions: count(transactionsTable.id),
        revenue: sum(transactionsTable.final_amount)
      })
      .from(transactionsTable)
      .where(
        and(
          gte(transactionsTable.transaction_date, startDate),
          lte(transactionsTable.transaction_date, endDate),
          eq(transactionsTable.payment_status, 'completed')
        )
      )
      .groupBy(sql`DATE(${transactionsTable.transaction_date})`)
      .orderBy(sql`DATE(${transactionsTable.transaction_date})`)
      .execute();

    // Calculate metrics with proper numeric conversions
    const totalTransactions = Number(transactionStats[0]?.total_transactions || 0);
    const totalRevenue = parseFloat(transactionStats[0]?.total_revenue || '0');
    const totalItemsSold = Number(itemStats[0]?.total_items_sold || 0);
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      total_transactions: totalTransactions,
      total_revenue: totalRevenue,
      total_items_sold: totalItemsSold,
      average_transaction_value: averageTransactionValue,
      top_products: topProducts.map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        quantity_sold: Number(product.quantity_sold),
        revenue: parseFloat(product.revenue || '0')
      })),
      daily_breakdown: dailyBreakdown.map(day => ({
        date: day.date,
        transactions: Number(day.transactions),
        revenue: parseFloat(day.revenue || '0')
      }))
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
};
