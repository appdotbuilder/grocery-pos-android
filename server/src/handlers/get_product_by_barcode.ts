
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getProductByBarcodeInputSchema = z.object({
    barcode: z.string()
});

type GetProductByBarcodeInput = z.infer<typeof getProductByBarcodeInputSchema>;

export const getProductByBarcode = async (input: GetProductByBarcodeInput): Promise<Product | null> => {
    try {
        const result = await db.select()
            .from(productsTable)
            .where(eq(productsTable.barcode, input.barcode))
            .execute();

        if (result.length === 0) {
            return null;
        }

        // Convert numeric fields back to numbers
        const product = result[0];
        return {
            ...product,
            base_price: parseFloat(product.base_price)
        };
    } catch (error) {
        console.error('Product barcode lookup failed:', error);
        throw error;
    }
};
