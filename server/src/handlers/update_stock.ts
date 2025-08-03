
import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateStockInputSchema = z.object({
    product_id: z.number(),
    quantity_change: z.number().int(),
    operation: z.enum(['add', 'subtract', 'set'])
});

type UpdateStockInput = z.infer<typeof updateStockInputSchema>;

export const updateStock = async (input: UpdateStockInput): Promise<{ success: boolean; new_quantity: number }> => {
    try {
        // First, get the current product to validate it exists and get current stock
        const products = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, input.product_id))
            .execute();

        if (products.length === 0) {
            throw new Error(`Product with id ${input.product_id} not found`);
        }

        const currentStock = products[0].stock_quantity;
        let newQuantity: number;

        // Calculate new quantity based on operation
        switch (input.operation) {
            case 'add':
                newQuantity = currentStock + input.quantity_change;
                break;
            case 'subtract':
                newQuantity = currentStock - input.quantity_change;
                break;
            case 'set':
                newQuantity = input.quantity_change;
                break;
        }

        // Validate that new quantity is not negative
        if (newQuantity < 0) {
            throw new Error(`Operation would result in negative stock: ${newQuantity}. Current stock: ${currentStock}`);
        }

        // Update the product stock quantity
        await db.update(productsTable)
            .set({ 
                stock_quantity: newQuantity,
                updated_at: new Date()
            })
            .where(eq(productsTable.id, input.product_id))
            .execute();

        return {
            success: true,
            new_quantity: newQuantity
        };
    } catch (error) {
        console.error('Stock update failed:', error);
        throw error;
    }
};
