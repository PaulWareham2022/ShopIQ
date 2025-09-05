import { InventoryItemRepository } from '../InventoryItemRepository';

describe('InventoryItemRepository (web fallback)', () => {
  let repo: InventoryItemRepository;

  beforeEach(() => {
    jest.resetModules();
    repo = new InventoryItemRepository();
  });

  it('findAll returns items with expected camelCase fields', async () => {
    const items = await repo.findAll();
    expect(Array.isArray(items)).toBe(true);
    if (items.length > 0) {
      const item = items[0];
      expect(item).toHaveProperty('canonicalUnit');
      expect(item).toHaveProperty('canonicalDimension');
      expect(item).toHaveProperty('shelfLifeSensitive');
    }
  });

  it('create, findById, update, and delete work in web fallback', async () => {
    const created = await repo.create({
      name: 'Test New Item',
      category: 'QA',
      canonicalDimension: 'count',
      canonicalUnit: 'unit',
      shelfLifeSensitive: false,
      notes: 'created via unit test',
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Test New Item');
    expect(created.canonicalUnit).toBe('unit');

    const fetched = await repo.findById(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.name).toBe('Test New Item');

    const updated = await repo.update(created.id, {
      shelfLifeSensitive: true,
      notes: 'updated',
    });
    expect(updated?.shelfLifeSensitive).toBe(true);
    expect(updated?.notes).toBe('updated');

    const deleted = await repo.delete(created.id);
    expect(deleted).toBe(true);

    const afterDelete = await repo.findById(created.id);
    expect(afterDelete).toBeNull();
  });
});
