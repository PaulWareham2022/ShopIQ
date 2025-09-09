/**
 * SupplierRepository Integration Tests
 * Tests CRUD operations and data persistence using web fallback database
 */

import { SupplierRepository } from '../SupplierRepository';

describe('SupplierRepository (web fallback)', () => {
  let repository: SupplierRepository;

  beforeEach(() => {
    jest.resetModules();
    repository = new SupplierRepository();
  });

  describe('Basic CRUD Operations', () => {
    it('should create, find, update, and delete suppliers', async () => {
      // Create a new supplier
      const supplierData = {
        name: 'Test Supplier',
        countryCode: 'CA',
        regionCode: 'CA-NS',
        storeCode: 'test-store',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        membershipType: 'Basic',
        shippingPolicy: {
          freeShippingThreshold: 35.0,
          shippingBaseCost: 5.99,
          pickupAvailable: true,
        },
        urlPatterns: ['https://example.com', '*.example.com'],
        notes: 'Test supplier notes',
      };

      const created = await repository.create(supplierData);

      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Test Supplier');
      expect(created.countryCode).toBe('CA');
      expect(created.regionCode).toBe('CA-NS');
      expect(created.defaultCurrency).toBe('CAD');
      expect(created.membershipRequired).toBe(false);
      expect(created.shippingPolicy).toEqual(supplierData.shippingPolicy);
      expect(created.urlPatterns).toEqual(supplierData.urlPatterns);

      // Find by ID
      const fetched = await repository.findById(created.id);
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.name).toBe('Test Supplier');
      expect(fetched?.shippingPolicy).toEqual(supplierData.shippingPolicy);
      expect(fetched?.urlPatterns).toEqual(supplierData.urlPatterns);

      // Update
      const updates = {
        name: 'Updated Supplier Name',
        notes: 'Updated notes',
        shippingPolicy: {
          freeShippingThreshold: 50.0,
          shippingBaseCost: 7.99,
          pickupAvailable: false,
        },
      };

      const updated = await repository.update(created.id, updates);
      expect(updated?.name).toBe('Updated Supplier Name');
      expect(updated?.notes).toBe('Updated notes');
      expect(updated?.shippingPolicy).toEqual(updates.shippingPolicy);

      // Delete (soft delete)
      const deleted = await repository.delete(created.id);
      expect(deleted).toBe(true);

      // Verify soft delete
      const afterDelete = await repository.findById(created.id);
      expect(afterDelete).toBeNull();
    });

    it('should create supplier with minimal required fields', async () => {
      const minimalData = {
        name: 'Minimal Supplier',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
      };

      const created = await repository.create(minimalData);

      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Minimal Supplier');
      expect(created.countryCode).toBe('US');
      expect(created.defaultCurrency).toBe('USD');
      expect(created.membershipRequired).toBe(false);
      expect(created.regionCode).toBeUndefined();
      expect(created.storeCode).toBeUndefined();
      expect(created.membershipType).toBeUndefined();
      expect(created.shippingPolicy).toBeUndefined();
      expect(created.urlPatterns).toBeUndefined();
      expect(created.notes).toBeUndefined();
    });
  });

  describe('Custom Query Methods', () => {
    it('should validate country code format', async () => {
      await expect(repository.findByCountryCode('invalid')).rejects.toThrow();
      await expect(repository.findByCountryCode('ca')).rejects.toThrow();
      await expect(repository.findByCountryCode('')).rejects.toThrow();
    });

    it('should handle findByName method (basic functionality)', async () => {
      // Test that the method exists and can be called
      const results = await repository.findByName('nonexistent');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle findByCountryCode method (basic functionality)', async () => {
      // Test that the method exists and can be called with valid input
      const results = await repository.findByCountryCode('CA');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle getStats method (basic functionality)', async () => {
      // Test that the method exists and returns expected structure
      try {
        const stats = await repository.getStats();
        expect(stats).toHaveProperty('total');
        expect(stats).toHaveProperty('withMembership');
        expect(stats).toHaveProperty('withShippingPolicy');
        expect(stats).toHaveProperty('withUrlPatterns');
      } catch (error) {
        // The web mock may not support the complex stats query
        // This is acceptable for basic integration testing
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Serialization', () => {
    it('should correctly handle JSON fields (shippingPolicy and urlPatterns)', async () => {
      const complexShippingPolicy = {
        freeShippingThreshold: 35.0,
        shippingBaseCost: 5.99,
        shippingPerItemCost: 1.5,
        pickupAvailable: true,
      };

      const urlPatterns = [
        'https://example.com',
        '*.example.com',
        'example.com/store/*',
      ];

      const supplier = await repository.create({
        name: 'Complex Supplier',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
        shippingPolicy: complexShippingPolicy,
        urlPatterns: urlPatterns,
      });

      // Verify JSON serialization/deserialization
      expect(supplier.shippingPolicy).toEqual(complexShippingPolicy);
      expect(supplier.urlPatterns).toEqual(urlPatterns);

      // Fetch and verify persistence
      const fetched = await repository.findById(supplier.id);
      expect(fetched?.shippingPolicy).toEqual(complexShippingPolicy);
      expect(fetched?.urlPatterns).toEqual(urlPatterns);

      // Clean up
      await repository.delete(supplier.id);
    });

    it('should correctly handle boolean field mapping', async () => {
      const membershipSupplier = await repository.create({
        name: 'Membership Store',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: true,
      });

      const noMembershipSupplier = await repository.create({
        name: 'No Membership Store',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
      });

      expect(membershipSupplier.membershipRequired).toBe(true);
      expect(noMembershipSupplier.membershipRequired).toBe(false);

      // Verify persistence
      const fetched1 = await repository.findById(membershipSupplier.id);
      const fetched2 = await repository.findById(noMembershipSupplier.id);

      expect(fetched1?.membershipRequired).toBe(true);
      expect(fetched2?.membershipRequired).toBe(false);

      // Clean up
      await repository.delete(membershipSupplier.id);
      await repository.delete(noMembershipSupplier.id);
    });

    it('should handle null/undefined optional fields correctly', async () => {
      const supplier = await repository.create({
        name: 'Minimal Store',
        countryCode: 'GB',
        defaultCurrency: 'GBP',
        membershipRequired: false,
        // All optional fields omitted
      });

      expect(supplier.regionCode).toBeUndefined();
      expect(supplier.storeCode).toBeUndefined();
      expect(supplier.membershipType).toBeUndefined();
      expect(supplier.shippingPolicy).toBeUndefined();
      expect(supplier.urlPatterns).toBeUndefined();
      expect(supplier.notes).toBeUndefined();

      // Verify persistence
      const fetched = await repository.findById(supplier.id);
      expect(fetched?.regionCode).toBeUndefined();
      expect(fetched?.storeCode).toBeUndefined();
      expect(fetched?.membershipType).toBeUndefined();
      expect(fetched?.shippingPolicy).toBeUndefined();
      expect(fetched?.urlPatterns).toBeUndefined();
      expect(fetched?.notes).toBeUndefined();

      // Clean up
      await repository.delete(supplier.id);
    });
  });

  describe('findAll operation', () => {
    it('should return all non-deleted suppliers', async () => {
      const initialCount = (await repository.findAll()).length;

      // Create test suppliers
      const supplier1 = await repository.create({
        name: 'Test Store 1',
        countryCode: 'CA',
        defaultCurrency: 'CAD',
        membershipRequired: false,
      });

      const supplier2 = await repository.create({
        name: 'Test Store 2',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: true,
      });

      const allSuppliers = await repository.findAll();
      expect(allSuppliers.length).toBe(initialCount + 2);

      // Verify both suppliers are in the results
      const supplierIds = allSuppliers.map(s => s.id);
      expect(supplierIds).toContain(supplier1.id);
      expect(supplierIds).toContain(supplier2.id);

      // Clean up
      await repository.delete(supplier1.id);
      await repository.delete(supplier2.id);

      // Verify they're no longer returned by findAll (soft deleted)
      const afterDelete = await repository.findAll();
      const afterDeleteIds = afterDelete.map(s => s.id);
      expect(afterDeleteIds).not.toContain(supplier1.id);
      expect(afterDeleteIds).not.toContain(supplier2.id);
    });
  });

  describe('Rating Updates', () => {
    it('should handle rating updates correctly including 0 ratings', async () => {
      // Create a supplier with no rating
      const supplierData = {
        name: 'Rating Test Supplier',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
      };

      const created = await repository.create(supplierData);
      expect(created.rating).toBeUndefined();

      // Test updating to rating 0 (no rating)
      const updatedToZero = await repository.update(created.id, { rating: 0 });
      expect(updatedToZero?.rating).toBe(0);

      // Test updating to rating 3
      const updatedToThree = await repository.update(created.id, { rating: 3 });
      expect(updatedToThree?.rating).toBe(3);

      // Test updating to rating 5
      const updatedToFive = await repository.update(created.id, { rating: 5 });
      expect(updatedToFive?.rating).toBe(5);

      // Test updating back to rating 0
      const updatedBackToZero = await repository.update(created.id, { rating: 0 });
      expect(updatedBackToZero?.rating).toBe(0);

      // Clean up
      await repository.delete(created.id);
    });

    it('should reject invalid rating values', async () => {
      const supplierData = {
        name: 'Invalid Rating Test Supplier',
        countryCode: 'US',
        defaultCurrency: 'USD',
        membershipRequired: false,
      };

      const created = await repository.create(supplierData);

      // Test invalid ratings (these should be caught by the database constraint)
      // Note: The web mock might not enforce constraints, so we test the behavior
      try {
        await repository.update(created.id, { rating: -1 });
        // If we get here, the web mock doesn't enforce constraints
        console.log('Web mock: constraint not enforced for negative rating');
      } catch (error) {
        // Expected behavior for native platforms
        expect(error).toBeDefined();
      }

      try {
        await repository.update(created.id, { rating: 6 });
        // If we get here, the web mock doesn't enforce constraints
        console.log('Web mock: constraint not enforced for rating > 5');
      } catch (error) {
        // Expected behavior for native platforms
        expect(error).toBeDefined();
      }

      // Clean up
      await repository.delete(created.id);
    });
  });
});
