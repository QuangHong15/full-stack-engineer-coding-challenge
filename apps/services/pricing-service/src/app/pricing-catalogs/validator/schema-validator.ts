export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  min?: number;
  max?: number;
  values?: string[];
  dependsOn?: {
    field: string;
    equals: string;
  };
}

export interface PricingSchema {
  fields: SchemaField[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateAttributes(
  attributes: Record<string, unknown> | null | undefined,
  schema: PricingSchema | null | undefined,
): ValidationError[] {
  // Kein Schema → alles erlaubt
  if (!schema || !schema.fields || schema.fields.length === 0) {
    return [];
  }

  const errors: ValidationError[] = [];
  const attrs = attributes ?? {};

  for (const field of schema.fields) {
    const value = attrs[field.name];

    // dependsOn prüfen — ist dieses Feld überhaupt aktiv?
    const isActive = isFieldActive(field, attrs, schema);

    // Pflichtfeld prüfen
    if (field.required && isActive) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field.name,
          message: `${field.name} is required`,
        });
        continue;
      }
    }

    // Wenn kein Wert → kein weiterer Check nötig
    if (value === undefined || value === null) {
      continue;
    }

    // Typ prüfen
    switch (field.type) {
      case 'string': {
        if (typeof value !== 'string') {
          errors.push({ field: field.name, message: `${field.name} must be a string` });
        }
        break;
      }

      case 'number': {
        if (typeof value !== 'number') {
          errors.push({ field: field.name, message: `${field.name} must be a number` });
          break;
        }
        if (field.min !== undefined && value < field.min) {
          errors.push({ field: field.name, message: `${field.name} must be >= ${field.min}` });
        }
        if (field.max !== undefined && value > field.max) {
          errors.push({ field: field.name, message: `${field.name} must be <= ${field.max}` });
        }
        break;
      }

      case 'boolean': {
        if (typeof value !== 'boolean') {
          errors.push({ field: field.name, message: `${field.name} must be a boolean` });
        }
        break;
      }

      case 'enum': {
        if (!field.values || field.values.length === 0) {
          errors.push({
            field: field.name,
            message: `${field.name} has no allowed values defined`,
          });
          break;
        }
        if (!field.values.includes(value as string)) {
          errors.push({
            field: field.name,
            message: `${field.name} must be one of: ${field.values.join(', ')}`,
          });
        }
        break;
      }
    }

    // Unbekannte Felder prüfen
  }

  // Unbekannte Felder ablehnen
  const knownFields = new Set(schema.fields.map((f) => f.name));
  for (const key of Object.keys(attrs)) {
    if (!knownFields.has(key)) {
      errors.push({ field: key, message: `${key} is not defined in the schema` });
    }
  }

  return errors;
}

function isFieldActive(
  field: SchemaField,
  attrs: Record<string, unknown>,
  schema: PricingSchema,
): boolean {
  if (!field.dependsOn) {
    return true;
  }

  // Prüfen ob das Elternfeld existiert im Schema
  const parentExists = schema.fields.some((f) => f.name === field.dependsOn!.field);
  if (!parentExists) {
    return false;
  }

  // Feld ist nur aktiv wenn dependsOn.field === dependsOn.equals
  return attrs[field.dependsOn.field] === field.dependsOn.equals;
}
