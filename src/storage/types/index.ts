/**
 * Core types and interfaces for the storage layer
 * This file defines the base types used across all repositories
 */

// Base entity interface - all entities must have these fields
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Generic repository interface for CRUD operations
export interface Repository<T extends BaseEntity> {
  // Create operations
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  createMany(
    entities: Omit<T, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<T[]>;

  // Read operations
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findWhere(conditions: Partial<T>, options?: QueryOptions): Promise<T[]>;
  count(conditions?: Partial<T>): Promise<number>;

  // Update operations
  update(
    id: string,
    updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<T | null>;
  updateMany(
    conditions: Partial<T>,
    updates: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<number>;

  // Delete operations (soft delete by default)
  delete(id: string): Promise<boolean>;
  deleteMany(conditions: Partial<T>): Promise<number>;

  // Hard delete operations (permanent removal)
  hardDelete(id: string): Promise<boolean>;
  hardDeleteMany(conditions: Partial<T>): Promise<number>;

  // Utility operations
  exists(id: string): Promise<boolean>;
  restore(id: string): Promise<T | null>; // Restore soft-deleted entity
}

// Key-value storage interface for MMKV-backed repositories
export interface KeyValueRepository {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  exists(key: string): boolean;
  getAllKeys(): string[];
  clear(): void;

  // JSON-specific operations
  getObject<T>(key: string): T | undefined;
  setObject<T>(key: string, value: T): void;
}

// Alias for implementations expecting the I-prefixed name
export type IKeyValueRepository = KeyValueRepository;

// Query options for filtering, sorting, and pagination
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean; // Include soft-deleted entities
}

// Sort direction for queries
export type SortDirection = 'ASC' | 'DESC';

// Database transaction interface
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  executeSql(sql: string, params?: any[]): Promise<any>;
}

// Repository factory interface
export interface IRepositoryFactory {
  getSupplierRepository(): Promise<Repository<Supplier>>;
  getInventoryItemRepository(): Promise<Repository<InventoryItem>>;
  getOfferRepository(): Promise<Repository<Offer>>;
  getUnitConversionRepository(): Promise<Repository<UnitConversion>>;
  getBundleRepository(): Promise<Repository<Bundle>>;
  getKeyValueRepository(namespace?: string): IKeyValueRepository;

  // Transaction support
  beginTransaction(): Promise<Transaction>;
}

// Storage configuration
export interface StorageConfig {
  databaseName: string;
  version: number;
  encryption?: boolean;
  encryptionKey?: string;
}

// Error types for storage operations
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class EntityNotFoundError extends StorageError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id ${id} not found`, 'ENTITY_NOT_FOUND');
  }
}

export class ValidationError extends StorageError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class DatabaseError extends StorageError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', originalError);
  }
}

// =============================================================================
// ENTITY INTERFACES - Based on PRD field definitions
// =============================================================================

// Enum types for strict validation
export type CanonicalDimension =
  | 'mass'
  | 'volume'
  | 'count'
  | 'length'
  | 'area';
export type SourceType = 'manual' | 'url' | 'ocr' | 'api';
export type PriceAllocationMethod = 'equal' | 'by-canonical-amount' | 'manual';

// Shipping policy structure for Supplier
export interface ShippingPolicy {
  /** Minimum order total to waive shipping (e.g., 35.00) */
  freeShippingThreshold?: number;
  /** Base shipping when threshold not met (e.g., 5.99) */
  shippingBaseCost?: number;
  /** Optional per-item adder where applicable */
  shippingPerItemCost?: number;
  /** Whether in-store/locker pickup can zero shipping */
  pickupAvailable?: boolean;
}

// Bundle item structure
export interface BundleItem {
  inventoryItemId: string;
  amount: number;
  unit: string;
}

// =============================================================================
// SUPPLIER ENTITY
// =============================================================================
export interface Supplier extends BaseEntity {
  /** Canonical supplier/store name used for display and dedupe (e.g., "Amazon.ca", "Costco Halifax") */
  name: string;

  /** ISO 3166-1 alpha-2 country code (e.g., "CA", "US") for tax/currency rules */
  countryCode: string;

  /** ISO 3166-2 region code (e.g., "CA-NS") for regional pricing/tax nuances */
  regionCode?: string;

  /** Internal short code if multiple outlets within same brand (e.g., "costco-bayerslake") */
  storeCode?: string;

  /** ISO 4217 currency code (e.g., "CAD") - default for offers from this supplier */
  defaultCurrency: string;

  /** Indicates membership affects access/pricing (e.g., Costco) */
  membershipRequired: boolean;

  /** Free text membership type (e.g., "Gold Star") for future amortization decisions */
  membershipType?: string;

  /** JSON object for quick shipping economics - MVP reads but may not compute all */
  shippingPolicy?: ShippingPolicy;

  /** Array of hostname/path hints to map scraped URLs to this supplier */
  urlPatterns?: string[];

  /** Free text for any operational caveats */
  notes?: string;
}

// =============================================================================
// INVENTORY ITEM ENTITY
// =============================================================================
export interface InventoryItem extends BaseEntity {
  /** Human-friendly item name (e.g., "Taylor R-0002 reagent") */
  name: string;

  /** Optional grouping (e.g., "Pool Chemicals", "Grocery/Meat") */
  category?: string;

  /** Used to choose canonical unit - one of mass/volume/count/length/area */
  canonicalDimension: CanonicalDimension;

  /** The canonical unit for normalization (e.g., "g", "ml", "unit", "m", "m2") - selected per item */
  canonicalUnit: string;

  /** If true, UI shows expiry-risk warnings on large quantities */
  shelfLifeSensitive: boolean;

  /** Typical shelf life if known - for future modeling */
  shelfLifeDays?: number;

  /** Numeric rate in canonicalUnit/day - captured via simple prompt for future optimization */
  usageRatePerDay?: number;

  /** JSON map for equivalence (e.g., { concentrationPercent: 10, grade: "food", packCount: 3 }) */
  attributes?: Record<string, any>;

  /** Optional multiplier for adjusted comparability (1.0 = exact equivalence) */
  equivalenceFactor?: number;

  /** Free text notes */
  notes?: string;
}

// =============================================================================
// OFFER ENTITY
// =============================================================================
export interface Offer extends BaseEntity {
  /** Foreign key to InventoryItem.id - which item this offer prices */
  inventoryItemId: string;

  /** Foreign key to Supplier.id - bind to a normalized supplier record */
  supplierId: string;

  /** Denormalized supplier name captured at time of entry for display stability */
  supplierNameSnapshot?: string;

  /** Product/offer URL for revisit or parsing */
  supplierUrl?: string;

  /** Provenance - helps debug parsers and data trust */
  sourceType: SourceType;

  /** If captured from a page different than supplierUrl (e.g., listing page) */
  sourceUrl?: string;

  /** JSON or text blob of raw parsed values before normalization - for audit */
  rawCapture?: string;

  /** When the price was observed (can differ from capturedAt) */
  observedAt: string;

  /** When the offer was entered into the app (auto-set) */
  capturedAt: string;

  /** Total price shown at point of sale for the unit(s) described */
  totalPrice: number;

  /** ISO 4217 currency code (e.g., "CAD") - required for accurate comparisons */
  currency: string;

  /** Whether totalPrice already includes sales tax (true for many grocery items) */
  isTaxIncluded: boolean;

  /** If isTaxIncluded=false and known, store applied tax rate (e.g., 0.15) - optional in MVP */
  taxRate?: number;

  /** Shipping cost applied to this single-offer scenario if freeShippingThreshold not met */
  shippingCost?: number;

  /** Supplier minimum order amount for this item or store */
  minOrderAmount?: number;

  /** Snapshot of the supplier threshold at time of capture */
  freeShippingThresholdAtCapture?: number;

  /** Convenience flag indicating whether shipping has been waived (e.g., pickup or threshold met) */
  shippingIncluded?: boolean;

  /** The quantity purchased (numeric) */
  amount: number;

  /** Unit as displayed on label (e.g., "ml", "L", "g", "kg", "tabs", "count") */
  amountUnit: string;

  /** Quantity converted into canonicalUnit (computed and stored for speed) */
  amountCanonical: number;

  /** Computed pre-tax price per canonical unit */
  pricePerCanonicalExclShipping: number;

  /** Computed price per canonical unit including shipping allocations */
  pricePerCanonicalInclShipping: number;

  /** Computed final normalized comparator including tax/shipping policy choices */
  effectivePricePerCanonical: number;

  /** If part of a multi-item bundle - used to allocate price later */
  bundleId?: string;

  /** Personal quality rating 1–5 for subjective equivalence adjustments later */
  qualityRating?: number;

  /** Free text notes */
  notes?: string;

  /** Optional image reference captured at time of entry */
  photoUri?: string;

  /** String tag of the normalization algorithm version for audit */
  computedByVersion?: string;
}

// =============================================================================
// UNIT CONVERSION ENTITY (static/reference)
// =============================================================================
export interface UnitConversion extends BaseEntity {
  /** Unit symbol (e.g., "kg") */
  fromUnit: string;

  /** Canonical unit symbol (e.g., "g") */
  toUnit: string;

  /** Multiplier to convert to canonical (e.g., 1000) */
  factor: number;

  /** Validates conversions - one of mass/volume/count/length/area */
  dimension: CanonicalDimension;
}

// =============================================================================
// BUNDLE ENTITY (future, optional for MVP)
// =============================================================================
export interface Bundle extends BaseEntity {
  /** Foreign key to Supplier.id */
  supplierId: string;

  /** Array describing bundle contents */
  items: BundleItem[];

  /** How to split bundle price across items */
  priceAllocationMethod: PriceAllocationMethod;
}
