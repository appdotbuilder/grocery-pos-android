
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'mobile', 'mixed']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'cancelled']);
export const paymentRecordMethodEnum = pgEnum('payment_record_method', ['cash', 'card', 'mobile']);

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  barcode: text('barcode'),
  base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  category_id: integer('category_id').references(() => categoriesTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Price variants table for different sizes/types
export const priceVariantsTable = pgTable('price_variants', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').references(() => productsTable.id).notNull(),
  variant_name: text('variant_name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_number: text('transaction_number').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  final_amount: numeric('final_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').references(() => transactionsTable.id).notNull(),
  product_id: integer('product_id').references(() => productsTable.id).notNull(),
  price_variant_id: integer('price_variant_id').references(() => priceVariantsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
});

// Payment records table for mixed payment support
export const paymentRecordsTable = pgTable('payment_records', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').references(() => transactionsTable.id).notNull(),
  payment_method: paymentRecordMethodEnum('payment_method').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  reference_number: text('reference_number'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  products: many(productsTable),
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id],
  }),
  priceVariants: many(priceVariantsTable),
  transactionItems: many(transactionItemsTable),
}));

export const priceVariantsRelations = relations(priceVariantsTable, ({ one, many }) => ({
  product: one(productsTable, {
    fields: [priceVariantsTable.product_id],
    references: [productsTable.id],
  }),
  transactionItems: many(transactionItemsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ many }) => ({
  items: many(transactionItemsTable),
  payments: many(paymentRecordsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id],
  }),
  priceVariant: one(priceVariantsTable, {
    fields: [transactionItemsTable.price_variant_id],
    references: [priceVariantsTable.id],
  }),
}));

export const paymentRecordsRelations = relations(paymentRecordsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [paymentRecordsTable.transaction_id],
    references: [transactionsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  categories: categoriesTable,
  products: productsTable,
  priceVariants: priceVariantsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  paymentRecords: paymentRecordsTable,
};
