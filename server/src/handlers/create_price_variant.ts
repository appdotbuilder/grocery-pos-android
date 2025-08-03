
import { db } from '../db';
import { priceVariantsTable, productsTable } from '../db/schema';
import { type CreatePriceVariantInput, type PriceVariant } from '../schema';
import { eq } from 'drizzle-orm';

export const createPriceVariant = async (input: CreatePriceVariantInput): Promise<PriceVariant> => {
  try {
    // Verify that the product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    // Insert price variant record
    const result = await db.insert(priceVariantsTable)
      .values({
        product_id: input.product_id,
        variant_name: input.variant_name,
        price: input.price.toString(), // Convert number to string for numeric column
        is_default: input.is_default
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const priceVariant = result[0];
    return {
      ...priceVariant,
      price: parseFloat(priceVariant.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Price variant creation failed:', error);
    throw error;
  }
};
