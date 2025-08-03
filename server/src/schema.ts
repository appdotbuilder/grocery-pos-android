
import { z } from 'zod';

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Product schema with proper numeric handling
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  barcode: z.string().nullable(),
  base_price: z.number(),
  stock_quantity: z.number().int(),
  category_id: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Price variant schema for different sizes/types
export const priceVariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  variant_name: z.string(),
  price: z.number(),
  is_default: z.boolean(),
  created_at: z.coerce.date()
});

export type PriceVariant = z.infer<typeof priceVariantSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  transaction_number: z.string(),
  total_amount: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  final_amount: z.number(),
  payment_method: z.enum(['cash', 'card', 'mobile', 'mixed']),
  payment_status: z.enum(['pending', 'completed', 'cancelled']),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  price_variant_id: z.number().nullable(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
  discount_amount: z.number()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Payment record schema
export const paymentRecordSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  payment_method: z.enum(['cash', 'card', 'mobile']),
  amount: z.number(),
  reference_number: z.string().nullable(),
  created_at: z.coerce.date()
});

export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

// Input schemas for creating/updating
export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  barcode: z.string().nullable(),
  base_price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  category_id: z.number().nullable(),
  is_active: z.boolean().default(true)
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  base_price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  category_id: z.number().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export const createPriceVariantInputSchema = z.object({
  product_id: z.number(),
  variant_name: z.string().min(1),
  price: z.number().positive(),
  is_default: z.boolean().default(false)
});

export type CreatePriceVariantInput = z.infer<typeof createPriceVariantInputSchema>;

export const createTransactionInputSchema = z.object({
  items: z.array(z.object({
    product_id: z.number(),
    price_variant_id: z.number().nullable(),
    quantity: z.number().int().positive(),
    discount_amount: z.number().nonnegative().default(0)
  })),
  tax_amount: z.number().nonnegative().default(0),
  discount_amount: z.number().nonnegative().default(0),
  payments: z.array(z.object({
    payment_method: z.enum(['cash', 'card', 'mobile']),
    amount: z.number().positive(),
    reference_number: z.string().nullable()
  }))
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const salesReportInputSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  report_type: z.enum(['daily', 'weekly', 'monthly'])
});

export type SalesReportInput = z.infer<typeof salesReportInputSchema>;

export const salesReportSchema = z.object({
  total_transactions: z.number(),
  total_revenue: z.number(),
  total_items_sold: z.number(),
  average_transaction_value: z.number(),
  top_products: z.array(z.object({
    product_id: z.number(),
    product_name: z.string(),
    quantity_sold: z.number(),
    revenue: z.number()
  })),
  daily_breakdown: z.array(z.object({
    date: z.string(),
    transactions: z.number(),
    revenue: z.number()
  }))
});

export type SalesReport = z.infer<typeof salesReportSchema>;
