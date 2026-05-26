import { validateAttributes, PricingSchema, ValidationError } from './schema-validator';

const windowsSchema: PricingSchema = {
  fields: [
    {
      name: 'frameMaterial',
      type: 'enum',
      values: ['wood', 'pvc', 'aluminum'],
      required: true,
    },
    {
      name: 'uValue',
      type: 'number',
      min: 0.5,
      max: 3.0,
      required: true,
    },
    {
      name: 'woodTreatment',
      type: 'string',
      required: true,
      dependsOn: { field: 'frameMaterial', equals: 'wood' },
    },
  ],
};

// ─── Happy Paths ───────────────────────────────────────────────────────────────

describe('validateAttributes — happy paths', () => {
  it('gibt keine Fehler bei gültigen Attributen', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 1.1 },
      windowsSchema,
    );

    expect(errors).toHaveLength(0);
  });

  it('gibt keine Fehler wenn kein Schema gesetzt', () => {
    const errors: ValidationError[] = validateAttributes({ anything: 'goes' }, null);

    expect(errors).toHaveLength(0);
  });

  it('gibt keine Fehler wenn attributes null und kein Schema', () => {
    const errors: ValidationError[] = validateAttributes(null, null);

    expect(errors).toHaveLength(0);
  });

  it('dependsOn — woodTreatment required wenn frameMaterial = wood', () => {
    const errors: ValidationError[] = validateAttributes(
      {
        frameMaterial: 'wood',
        uValue: 1.1,
        woodTreatment: 'lacquer',
      },
      windowsSchema,
    );

    expect(errors).toHaveLength(0);
  });

  it('dependsOn — woodTreatment nicht required wenn frameMaterial != wood', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 1.1 },
      windowsSchema,
    );

    expect(errors).toHaveLength(0);
  });
});

// ─── Failure Modes ─────────────────────────────────────────────────────────────

describe('validateAttributes — failure modes', () => {
  it('fehler bei fehlendem Pflichtfeld', () => {
    const errors: ValidationError[] = validateAttributes({ uValue: 1.1 }, windowsSchema);

    expect(errors.some((e) => e.field === 'frameMaterial')).toBe(true);
  });

  it('fehler bei ungültigem Enum-Wert', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'steel', uValue: 1.1 },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'frameMaterial')).toBe(true);
  });

  it('fehler bei number unter min', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 0.1 },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'uValue')).toBe(true);
  });

  it('fehler bei number über max', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 5.0 },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'uValue')).toBe(true);
  });

  it('fehler bei falschem Typ', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 'not-a-number' },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'uValue')).toBe(true);
  });

  it('fehler bei unbekanntem Feld', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'pvc', uValue: 1.1, unknownField: 'x' },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'unknownField')).toBe(true);
  });

  it('dependsOn — fehler wenn woodTreatment fehlt obwohl frameMaterial = wood', () => {
    const errors: ValidationError[] = validateAttributes(
      { frameMaterial: 'wood', uValue: 1.1 },
      windowsSchema,
    );

    expect(errors.some((e) => e.field === 'woodTreatment')).toBe(true);
  });
});
