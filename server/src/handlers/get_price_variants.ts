
import { db } from '../db';
import { priceVariantsTable } from '../db/schema';
import { type PriceVariant } from '../schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const getPriceVariantsInputSchema = z.object({
    product_id: z.number()
});

type GetPriceVariantsInput = z.infer<typeof getPriceVariantsInputSchema>;

export const getPriceVariants = async (input: GetPriceVariantsInput): Promise<PriceVariant[]> => {
    try {
        const results = await db.select()
            .from(priceVariantsTable)
            .where(eq(priceVariantsTable.product_id, input.product_id))
            .execute();

        // Convert numeric fields back to numbers
        return results.map(variant => ({
            ...variant,
            price: parseFloat(variant.price)
        }));
    } catch (error) {
        console.error('Failed to fetch price variants:', error);
        throw error;
    }
};
