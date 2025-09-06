# Comparison Engine Design

## Overview

The comparison engine provides a flexible, extensible system for comparing inventory item offers using different strategies. It supports runtime configuration and allows for multiple comparison criteria to be combined.

## Architecture

### Core Components

1. **Comparator Interface** - Defines the contract for all comparison strategies
2. **Comparison Strategies** - Concrete implementations for different comparison methods
3. **Comparison Configuration** - Runtime configuration for selecting and combining strategies
4. **Comparison Engine** - Orchestrates the comparison process
5. **Comparison Results** - Structured results with metadata

### Design Patterns

- **Strategy Pattern** - Different comparison algorithms
- **Composite Pattern** - Combining multiple strategies
- **Factory Pattern** - Creating comparators based on configuration
- **Builder Pattern** - Constructing complex comparison configurations

## Comparison Strategies

### 1. Price-Based Comparators

#### PricePerCanonicalComparator
- **Primary Strategy**: Compares offers by price per canonical unit
- **Options**:
  - `includeShipping`: boolean (default: true)
  - `includeTax`: boolean (default: true)
  - `useEffectivePrice`: boolean (default: true)
- **Use Case**: Standard price comparison for most items

#### TotalPriceComparator
- **Primary Strategy**: Compares offers by total price regardless of quantity
- **Options**:
  - `includeShipping`: boolean (default: true)
  - `includeTax`: boolean (default: true)
- **Use Case**: When quantity differences are not significant

#### PricePerUnitComparator
- **Primary Strategy**: Compares offers by price per display unit (not canonical)
- **Options**:
  - `includeShipping`: boolean (default: true)
  - `includeTax`: boolean (default: true)
- **Use Case**: When canonical unit conversion is not desired

### 2. Quality-Based Comparators

#### QualityRatingComparator
- **Primary Strategy**: Compares offers by quality rating (1-5 scale)
- **Options**:
  - `weight`: number (default: 1.0)
  - `preferHigher`: boolean (default: true)
- **Use Case**: When quality is more important than price

#### QualityAdjustedPriceComparator
- **Primary Strategy**: Adjusts price based on quality rating
- **Options**:
  - `qualityWeight`: number (default: 0.2)
  - `priceWeight`: number (default: 0.8)
  - `qualityAdjustmentFactor`: number (default: 0.1)
- **Use Case**: Balanced price-quality comparison

### 3. Temporal Comparators

#### RecentPriceComparator
- **Primary Strategy**: Prefers more recent price observations
- **Options**:
  - `maxAgeDays`: number (default: 30)
  - `decayFactor`: number (default: 0.1)
- **Use Case**: When price freshness is important

#### HistoricalTrendComparator
- **Primary Strategy**: Analyzes price trends over time
- **Options**:
  - `trendWindowDays`: number (default: 90)
  - `trendWeight`: number (default: 0.3)
- **Use Case**: Predicting future price movements

### 4. Supplier-Based Comparators

#### SupplierReliabilityComparator
- **Primary Strategy**: Prefers offers from reliable suppliers
- **Options**:
  - `reliabilityWeight`: number (default: 0.1)
  - `supplierScores`: Record<string, number>
- **Use Case**: When supplier trust is important

#### MembershipRequiredComparator
- **Primary Strategy**: Adjusts for membership requirements
- **Options**:
  - `membershipPenalty`: number (default: 0.05)
  - `considerMembershipValue`: boolean (default: true)
- **Use Case**: When membership costs should be factored

### 5. Composite Comparators

#### WeightedCompositeComparator
- **Primary Strategy**: Combines multiple strategies with weights
- **Options**:
  - `strategies`: Array<{strategy: string, weight: number, options?: any}>
- **Use Case**: Complex multi-criteria comparison

#### ConditionalComparator
- **Primary Strategy**: Uses different strategies based on conditions
- **Options**:
  - `conditions`: Array<{condition: string, strategy: string, options?: any}>
- **Use Case**: Context-dependent comparison logic

## Configuration Schema

```typescript
interface ComparisonConfig {
  // Primary comparison strategy
  primaryStrategy: string;
  
  // Strategy-specific options
  strategyOptions?: Record<string, any>;
  
  // Secondary strategies (for composite comparisons)
  secondaryStrategies?: Array<{
    strategy: string;
    weight: number;
    options?: Record<string, any>;
  }>;
  
  // Global options
  globalOptions?: {
    includeDeleted?: boolean;
    maxResults?: number;
    sortDirection?: 'asc' | 'desc';
  };
  
  // Context-specific overrides
  contextOverrides?: Record<string, Partial<ComparisonConfig>>;
}
```

## Usage Examples

### Basic Price Comparison
```typescript
const config: ComparisonConfig = {
  primaryStrategy: 'pricePerCanonical',
  strategyOptions: {
    includeShipping: true,
    includeTax: true
  }
};
```

### Quality-Adjusted Price Comparison
```typescript
const config: ComparisonConfig = {
  primaryStrategy: 'qualityAdjustedPrice',
  strategyOptions: {
    qualityWeight: 0.3,
    priceWeight: 0.7,
    qualityAdjustmentFactor: 0.15
  }
};
```

### Composite Comparison
```typescript
const config: ComparisonConfig = {
  primaryStrategy: 'weightedComposite',
  strategyOptions: {
    strategies: [
      { strategy: 'pricePerCanonical', weight: 0.6 },
      { strategy: 'qualityRating', weight: 0.3 },
      { strategy: 'recentPrice', weight: 0.1 }
    ]
  }
};
```

## Extensibility

### Adding New Strategies

1. Implement the `Comparator` interface
2. Register the strategy in the `ComparatorRegistry`
3. Add configuration options to the schema
4. Update documentation and tests

### Custom Comparison Logic

The system supports custom comparison logic through:
- Strategy plugins
- Custom comparator implementations
- Runtime strategy registration
- Configuration-based strategy selection

## Performance Considerations

- **Caching**: Comparison results are cached based on configuration hash
- **Indexing**: Database indexes support common comparison queries
- **Lazy Loading**: Strategies are loaded only when needed
- **Batch Processing**: Multiple comparisons can be batched for efficiency

## Migration Strategy

The new comparison system maintains backward compatibility:
- Existing `effective_price_per_canonical` queries continue to work
- Default configuration matches current behavior
- Gradual migration path for new comparison features
- Fallback to legacy comparison when needed

## Testing Strategy

- **Unit Tests**: Each strategy tested independently
- **Integration Tests**: End-to-end comparison scenarios
- **Performance Tests**: Large dataset comparison performance
- **Regression Tests**: Ensure backward compatibility
