import { calculateQuote, QuoteError } from './quote-calculator';
import { CatalogVersion, CatalogVersionStatus } from '../entities/catalog-version.entity';
import { CatalogPosition, PositionUnit } from '../entities/catalog-position.entity';
import { CatalogSurcharge } from '../entities/catalog-surcharge.entity';
import { CatalogDiscount } from '../entities/catalog-discount.entity';

// Helper um eine Test-Version zu bauen
function makeVersion(overrides: Partial<CatalogVersion> = {}): CatalogVersion {
  const version = new CatalogVersion();
  version.id = 'version-1';
  version.craftsmanId = 'craftsman-1';
  version.trade = 'WINDOWS';
  version.status = CatalogVersionStatus.PUBLISHED;
  version.effectiveFrom = '2024-01-01';
  version.publishedBy = 'user-1';
  version.publishedAt = new Date();
  version.positions = [];
  version.discounts = [];
  return Object.assign(version, overrides);
}

function makePosition(overrides: Partial<CatalogPosition> = {}): CatalogPosition {
  const position = new CatalogPosition();
  position.id = 'pos-1';
  position.versionId = 'version-1';
  position.key = 'fenster-standard';
  position.label = 'Fenster einbauen (Standard)';
  position.unit = PositionUnit.PIECE;
  position.netPriceCents = 20000; // 200,00 €
  position.vatRate = 0.19;
  position.minQuantity = null;
  position.maxQuantity = null;
  position.attributes = null;
  position.surcharges = [];
  return Object.assign(position, overrides);
}

function makeSurcharge(overrides: Partial<CatalogSurcharge> = {}): CatalogSurcharge {
  const surcharge = new CatalogSurcharge();
  surcharge.id = 'surcharge-1';
  surcharge.positionId = 'pos-1';
  surcharge.key = 'notfall';
  surcharge.label = 'Notfall-Zuschlag';
  surcharge.flatCents = 5000; // 50,00 €
  surcharge.percent = null;
  return Object.assign(surcharge, overrides);
}

function makeDiscount(overrides: Partial<CatalogDiscount> = {}): CatalogDiscount {
  const discount = new CatalogDiscount();
  discount.id = 'discount-1';
  discount.versionId = 'version-1';
  discount.key = 'treue-rabatt';
  discount.label = 'Treuerabatt';
  discount.flatCents = null;
  discount.percent = null;
  discount.capCents = null;
  discount.appliesTo = 'subtotal';
  return Object.assign(discount, overrides);
}

// ─── Happy Paths ───────────────────────────────────────────────────────────────

describe('calculateQuote — happy paths', () => {
  it('berechnet eine einfache Zeile ohne Zuschläge', () => {
    const version = makeVersion({
      positions: [makePosition()],
    });

    const result = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 2 }]);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineNetCents).toBe(40000); // 2 × 200,00 €
    expect(result.lines[0].vatCents).toBe(7600); // 40000 × 0.19
    expect(result.lines[0].totalGrossCents).toBe(47600);
    expect(result.totalNetCents).toBe(40000);
    expect(result.totalVatCents).toBe(7600);
    expect(result.totalGrossCents).toBe(47600);
  });

  it('wendet einen Flat-Zuschlag an', () => {
    const position = makePosition({
      surcharges: [makeSurcharge({ flatCents: 5000 })],
    });
    const version = makeVersion({ positions: [position] });

    const result = calculateQuote(version, [
      { positionKey: 'fenster-standard', quantity: 1, appliedSurchargeKeys: ['notfall'] },
    ]);

    expect(result.lines[0].totalNetCents).toBe(25000); // 200,00 + 50,00
  });

  it('wendet einen Prozent-Zuschlag an', () => {
    const position = makePosition({
      surcharges: [makeSurcharge({ flatCents: null, percent: 0.15 })],
    });
    const version = makeVersion({ positions: [position] });

    const result = calculateQuote(version, [
      { positionKey: 'fenster-standard', quantity: 1, appliedSurchargeKeys: ['notfall'] },
    ]);

    // 20000 + 15% = 20000 + 3000 = 23000
    expect(result.lines[0].totalNetCents).toBe(23000);
  });

  it('wendet einen Flat-Rabatt auf subtotal an', () => {
    const version = makeVersion({
      positions: [makePosition()],
      discounts: [makeDiscount({ flatCents: 2000, appliesTo: 'subtotal' })],
    });

    const result = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 1 }]);

    expect(result.totalDiscountCents).toBe(2000);
    expect(result.totalNetCents).toBe(18000); // 20000 - 2000
  });

  it('wendet einen Prozent-Rabatt mit Cap an', () => {
    const version = makeVersion({
      positions: [makePosition({ netPriceCents: 500000 })], // 5000,00 €
      discounts: [
        makeDiscount({
          percent: 0.1,
          capCents: 20000, // Cap: 200,00 €
          appliesTo: 'subtotal',
        }),
      ],
    });

    const result = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 1 }]);

    // 10% von 500000 = 50000, aber Cap = 20000
    expect(result.totalDiscountCents).toBe(20000);
  });

  it('gruppiert gemischte MwSt-Sätze korrekt', () => {
    const pos1 = makePosition({ key: 'pos-19', vatRate: 0.19, netPriceCents: 10000 });
    const pos2 = makePosition({ key: 'pos-07', vatRate: 0.07, netPriceCents: 10000 });
    const version = makeVersion({ positions: [pos1, pos2] });

    const result = calculateQuote(version, [
      { positionKey: 'pos-19', quantity: 1 },
      { positionKey: 'pos-07', quantity: 1 },
    ]);

    expect(result.vatGroups).toHaveLength(2);

    const group19 = result.vatGroups.find((g) => g.vatRate === 0.19);
    const group07 = result.vatGroups.find((g) => g.vatRate === 0.07);

    expect(group19?.vatCents).toBe(1900);
    expect(group07?.vatCents).toBe(700);
    expect(result.totalVatCents).toBe(2600);
  });

  it('berechnet mehrere gestapelte Rabatte', () => {
    const version = makeVersion({
      positions: [makePosition({ netPriceCents: 100000 })],
      discounts: [
        makeDiscount({ key: 'rabatt-1', flatCents: 10000, appliesTo: 'subtotal' }),
        makeDiscount({ key: 'rabatt-2', flatCents: 5000, appliesTo: 'subtotal' }),
      ],
    });

    const result = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 1 }]);

    expect(result.totalDiscountCents).toBe(15000);
    expect(result.totalNetCents).toBe(85000);
  });
});

// ─── Error Cases ───────────────────────────────────────────────────────────────

describe('calculateQuote — error cases', () => {
  it('wirft bei unbekannter Position', () => {
    const version = makeVersion({ positions: [] });

    expect(() => calculateQuote(version, [{ positionKey: 'unbekannt', quantity: 1 }])).toThrow();
  });

  it('wirft bei Quantity unter minQuantity', () => {
    const position = makePosition({ minQuantity: 2, maxQuantity: null });
    const version = makeVersion({ positions: [position] });

    expect(() =>
      calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 1 }]),
    ).toThrow();
  });

  it('wirft bei Quantity über maxQuantity', () => {
    const position = makePosition({ minQuantity: null, maxQuantity: 5 });
    const version = makeVersion({ positions: [position] });

    expect(() =>
      calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 10 }]),
    ).toThrow();
  });

  it('wirft bei unbekanntem Zuschlag-Key', () => {
    const position = makePosition({ surcharges: [] });
    const version = makeVersion({ positions: [position] });

    expect(() =>
      calculateQuote(version, [
        {
          positionKey: 'fenster-standard',
          quantity: 1,
          appliedSurchargeKeys: ['unbekannt'],
        },
      ]),
    ).toThrow();
  });
});

// ─── Invariant Tests ───────────────────────────────────────────────────────────

describe('calculateQuote — invarianten', () => {
  it('brutto ist immer >= netto bei nicht-negativen inputs', () => {
    const version = makeVersion({ positions: [makePosition()] });
    const result = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 5 }]);
    expect(result.totalGrossCents).toBeGreaterThanOrEqual(result.totalNetCents);
  });

  it('summe der MwSt-Gruppen = gesamt MwSt', () => {
    const pos1 = makePosition({ key: 'pos-19', vatRate: 0.19, netPriceCents: 10000 });
    const pos2 = makePosition({ key: 'pos-07', vatRate: 0.07, netPriceCents: 10000 });
    const version = makeVersion({ positions: [pos1, pos2] });

    const result = calculateQuote(version, [
      { positionKey: 'pos-19', quantity: 1 },
      { positionKey: 'pos-07', quantity: 1 },
    ]);

    const summedVat = result.vatGroups.reduce((sum, g) => sum + g.vatCents, 0);
    expect(summedVat).toBe(result.totalVatCents);
  });

  it('quantity verdoppeln verdoppelt die netto-summe exakt', () => {
    const version = makeVersion({ positions: [makePosition()] });

    const result1 = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 3 }]);
    const result2 = calculateQuote(version, [{ positionKey: 'fenster-standard', quantity: 6 }]);

    expect(result2.totalNetCents).toBe(result1.totalNetCents * 2);
  });

  it('ein 0-Flat-Zuschlag ist ein No-Op', () => {
    const position = makePosition({
      surcharges: [makeSurcharge({ flatCents: 0 })],
    });
    const versionMit = makeVersion({ positions: [position] });
    const versionOhne = makeVersion({ positions: [makePosition()] });

    const mit = calculateQuote(versionMit, [
      {
        positionKey: 'fenster-standard',
        quantity: 1,
        appliedSurchargeKeys: ['notfall'],
      },
    ]);
    const ohne = calculateQuote(versionOhne, [
      {
        positionKey: 'fenster-standard',
        quantity: 1,
      },
    ]);

    expect(mit.totalNetCents).toBe(ohne.totalNetCents);
  });
});
