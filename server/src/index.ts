
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createCategoryInputSchema,
  createProductInputSchema, 
  updateProductInputSchema,
  createPriceVariantInputSchema,
  createTransactionInputSchema,
  salesReportInputSchema
} from './schema';

// Import handlers
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { getProductByBarcode } from './handlers/get_product_by_barcode';
import { createPriceVariant } from './handlers/create_price_variant';
import { getPriceVariants } from './handlers/get_price_variants';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransactionDetails } from './handlers/get_transaction_details';
import { generateSalesReport } from './handlers/generate_sales_report';
import { updateStock } from './handlers/update_stock';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  getCategories: publicProcedure
    .query(() => getCategories()),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  getProducts: publicProcedure
    .query(() => getProducts()),
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input)),
  getProductByBarcode: publicProcedure
    .input(z.object({ barcode: z.string() }))
    .query(({ input }) => getProductByBarcode(input)),

  // Price variant management
  createPriceVariant: publicProcedure
    .input(createPriceVariantInputSchema)
    .mutation(({ input }) => createPriceVariant(input)),
  getPriceVariants: publicProcedure
    .input(z.object({ product_id: z.number() }))
    .query(({ input }) => getPriceVariants(input)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  getTransactions: publicProcedure
    .input(z.object({ 
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
      limit: z.number().int().positive().default(50),
      offset: z.number().int().nonnegative().default(0)
    }))
    .query(({ input }) => getTransactions(input)),
  getTransactionDetails: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransactionDetails(input)),

  // Reporting
  generateSalesReport: publicProcedure
    .input(salesReportInputSchema)
    .query(({ input }) => generateSalesReport(input)),

  // Stock management
  updateStock: publicProcedure
    .input(z.object({ 
      product_id: z.number(),
      quantity_change: z.number().int(),
      operation: z.enum(['add', 'subtract', 'set'])
    }))
    .mutation(({ input }) => updateStock(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
