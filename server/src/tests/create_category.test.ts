
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and accessories'
};

const testInputWithoutDescription: CreateCategoryInput = {
  name: 'Books',
  description: null
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Electronic devices and accessories');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category without description', async () => {
    const result = await createCategory(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Books');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Electronics');
    expect(categories[0].description).toEqual('Electronic devices and accessories');
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple categories', async () => {
    const result1 = await createCategory(testInput);
    const result2 = await createCategory(testInputWithoutDescription);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Electronics');
    expect(result2.name).toEqual('Books');

    // Verify both are in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });
});
