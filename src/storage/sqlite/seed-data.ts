/**
 * Seed Data for SQLite Database
 *
 * This file contains default/reference data that should be populated
 * when the database is first created, particularly unit conversions.
 */

import { generateUUID } from '../utils/uuid';
import {
  ALL_UNIT_CONVERSIONS,
  UnitConversionData,
} from '../utils/conversion-data';

/**
 * Default unit conversions based on PRD requirements
 * Mass: kg→g (×1000); Volume: L→ml (×1000); Count/length/area as declared per item
 */
export interface UnitConversionSeed extends UnitConversionData {
  id?: string;
}

// Export the conversion data from the centralized location
export { ALL_UNIT_CONVERSIONS };

/**
 * Convert seed data to database insertion format
 */
export const getUnitConversionsForInsert = () => {
  return ALL_UNIT_CONVERSIONS.map(conversion => ({
    id: generateUUID(),
    from_unit: conversion.fromUnit,
    to_unit: conversion.toUnit,
    factor: conversion.factor,
    dimension: conversion.dimension,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
};

/**
 * SQL statements to insert all unit conversions
 */
export const getUnitConversionInsertStatements = () => {
  const conversions = getUnitConversionsForInsert();
  return conversions.map(conversion => ({
    sql: `
      INSERT INTO unit_conversions (
        id, from_unit, to_unit, factor, dimension, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      conversion.id,
      conversion.from_unit,
      conversion.to_unit,
      conversion.factor,
      conversion.dimension,
      conversion.created_at,
      conversion.updated_at,
    ],
  }));
};

/**
 * Batch SQL for efficient unit conversion seeding
 */
export const getBatchUnitConversionSQL = () => {
  const conversions = getUnitConversionsForInsert();
  const placeholders = conversions
    .map(() => '(?, ?, ?, ?, ?, ?, ?)')
    .join(', ');
  const values = conversions.flatMap(c => [
    c.id,
    c.from_unit,
    c.to_unit,
    c.factor,
    c.dimension,
    c.created_at,
    c.updated_at,
  ]);

  return {
    sql: `
      INSERT INTO unit_conversions (
        id, from_unit, to_unit, factor, dimension, created_at, updated_at
      ) VALUES ${placeholders}
    `,
    params: values,
  };
};
