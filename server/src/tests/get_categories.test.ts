
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Electronics',
          description: 'Electronic devices and accessories'
        },
        {
          name: 'Books',
          description: 'Books and publications'
        },
        {
          name: 'Clothing',
          description: null
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Check first category
    const electronics = result.find(cat => cat.name === 'Electronics');
    expect(electronics).toBeDefined();
    expect(electronics!.description).toEqual('Electronic devices and accessories');
    expect(electronics!.id).toBeDefined();
    expect(electronics!.created_at).toBeInstanceOf(Date);

    // Check category with null description
    const clothing = result.find(cat => cat.name === 'Clothing');
    expect(clothing).toBeDefined();
    expect(clothing!.description).toBeNull();
    expect(clothing!.id).toBeDefined();
    expect(clothing!.created_at).toBeInstanceOf(Date);
  });

  it('should return categories in correct order', async () => {
    // Create categories with specific order
    const firstCategory = await db.insert(categoriesTable)
      .values({
        name: 'First Category',
        description: 'Created first'
      })
      .returning()
      .execute();

    const secondCategory = await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        description: 'Created second'
      })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    
    // Categories should be returned in database order (by id)
    expect(result[0].id).toEqual(firstCategory[0].id);
    expect(result[1].id).toEqual(secondCategory[0].id);
  });
});
