
import { db } from '../db';
import { productsTable, transactionsTable, transactionItemsTable, paymentRecordsTable, priceVariantsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Generate unique transaction number
      const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate totals from items
      let totalAmount = 0;
      const itemsWithPrices = [];
      
      for (const item of input.items) {
        // Get product price (from variant if specified, otherwise base price)
        let unitPrice: number;
        
        if (item.price_variant_id) {
          const variant = await tx.select()
            .from(priceVariantsTable)
            .where(eq(priceVariantsTable.id, item.price_variant_id))
            .execute();
          
          if (!variant.length) {
            throw new Error(`Price variant with ID ${item.price_variant_id} not found`);
          }
          
          unitPrice = parseFloat(variant[0].price);
        } else {
          const product = await tx.select()
            .from(productsTable)
            .where(eq(productsTable.id, item.product_id))
            .execute();
          
          if (!product.length) {
            throw new Error(`Product with ID ${item.product_id} not found`);
          }
          
          unitPrice = parseFloat(product[0].base_price);
        }
        
        const totalPrice = (unitPrice * item.quantity) - item.discount_amount;
        totalAmount += totalPrice;
        
        itemsWithPrices.push({
          ...item,
          unit_price: unitPrice,
          total_price: totalPrice
        });
      }
      
      // Calculate final amount
      const finalAmount = totalAmount + input.tax_amount - input.discount_amount;
      
      // Validate payment amounts match final amount
      const totalPayments = input.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (Math.abs(totalPayments - finalAmount) > 0.01) {
        throw new Error(`Payment total (${totalPayments}) does not match final amount (${finalAmount})`);
      }
      
      // Determine payment method
      const paymentMethod = input.payments.length > 1 ? 'mixed' : input.payments[0].payment_method;
      
      // Create transaction record
      const transactionResult = await tx.insert(transactionsTable)
        .values({
          transaction_number: transactionNumber,
          total_amount: totalAmount.toString(),
          tax_amount: input.tax_amount.toString(),
          discount_amount: input.discount_amount.toString(),
          final_amount: finalAmount.toString(),
          payment_method: paymentMethod,
          payment_status: 'completed'
        })
        .returning()
        .execute();
      
      const transaction = transactionResult[0];
      
      // Create transaction items and update stock
      for (const item of itemsWithPrices) {
        // Insert transaction item
        await tx.insert(transactionItemsTable)
          .values({
            transaction_id: transaction.id,
            product_id: item.product_id,
            price_variant_id: item.price_variant_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            total_price: item.total_price.toString(),
            discount_amount: item.discount_amount.toString()
          })
          .execute();
        
        // Update product stock
        await tx.update(productsTable)
          .set({
            stock_quantity: sql`${productsTable.stock_quantity} - ${item.quantity}`,
            updated_at: new Date()
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }
      
      // Create payment records
      for (const payment of input.payments) {
        await tx.insert(paymentRecordsTable)
          .values({
            transaction_id: transaction.id,
            payment_method: payment.payment_method,
            amount: payment.amount.toString(),
            reference_number: payment.reference_number
          })
          .execute();
      }
      
      // Return transaction with proper numeric conversions
      return {
        ...transaction,
        total_amount: parseFloat(transaction.total_amount),
        tax_amount: parseFloat(transaction.tax_amount),
        discount_amount: parseFloat(transaction.discount_amount),
        final_amount: parseFloat(transaction.final_amount)
      };
    });
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};
