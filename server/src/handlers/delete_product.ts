
import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const deleteProductInputSchema = z.object({
    id: z.number()
});

type DeleteProductInput = z.infer<typeof deleteProductInputSchema>;

export const deleteProduct = async (input: DeleteProductInput): Promise<{ success: boolean }> => {
  try {
    // Soft delete by setting is_active to false
    const result = await db.update(productsTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Check if any rows were affected
    if (result.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
};
