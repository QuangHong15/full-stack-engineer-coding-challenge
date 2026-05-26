import { CatalogVersion } from '../entities/catalog-version.entity';

export interface QuoteLineInput {
  positionKey: string;
  quantity: number;
  appliedSurchargeKeys?: string[];
}

export interface AppliedSurchargeResult {
  key: string;
  label: string;
  amountCents: number;
}

export interface AppliedDiscountResult {
  key: string;
  label: string;
  amountCents: number;
}

export interface QuoteLineResult {
  positionKey: string;
  label: string;
  quantity: number;
  unitNetCents: number;
  lineNetCents: number;
  appliedSurcharges: AppliedSurchargeResult[];
  appliedDiscounts: AppliedDiscountResult[];
  totalNetCents: number;
  vatRate: number;
  vatCents: number;
  totalGrossCents: number;
}

export interface VatGroupResult {
  vatRate: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

export interface QuoteResult {
  lines: QuoteLineResult[];
  vatGroups: VatGroupResult[];
  totalNetCents: number;
  totalDiscountCents: number;
  totalVatCents: number;
  totalGrossCents: number;
}

export interface QuoteError {
  type: 'UNKNOWN_POSITION' | 'QUANTITY_OUT_OF_RANGE' | 'UNKNOWN_SURCHARGE' | 'INACTIVE_CRAFTSMAN';
  message: string;
}

export function calculateQuote(version: CatalogVersion, lines: QuoteLineInput[]): QuoteResult {
  const results: QuoteLineResult[] = [];

  for (const lineInput of lines) {
    // 1. Position finden
    const position = version.positions.find((p) => p.key === lineInput.positionKey);
    if (!position) {
      throw {
        type: 'UNKNOWN_POSITION',
        message: `Unknown position key: ${lineInput.positionKey}`,
      } as QuoteError;
    }

    // 2. Quantity prüfen
    if (lineInput.quantity < 0) {
      throw {
        type: 'QUANTITY_OUT_OF_RANGE',
        message: `Quantity must be >= 0 for position ${lineInput.positionKey}`,
      } as QuoteError;
    }
    if (position.minQuantity !== null && lineInput.quantity < position.minQuantity) {
      throw {
        type: 'QUANTITY_OUT_OF_RANGE',
        message: `Quantity ${lineInput.quantity} is below minimum ${position.minQuantity} for position ${lineInput.positionKey}`,
      } as QuoteError;
    }
    if (position.maxQuantity !== null && lineInput.quantity > position.maxQuantity) {
      throw {
        type: 'QUANTITY_OUT_OF_RANGE',
        message: `Quantity ${lineInput.quantity} exceeds maximum ${position.maxQuantity} for position ${lineInput.positionKey}`,
      } as QuoteError;
    }

    // 3. Zuschläge prüfen und berechnen
    const appliedSurcharges: AppliedSurchargeResult[] = [];
    const requestedKeys = lineInput.appliedSurchargeKeys ?? [];

    for (const surchargeKey of requestedKeys) {
      const surcharge = position.surcharges.find((s) => s.key === surchargeKey);
      if (!surcharge) {
        throw {
          type: 'UNKNOWN_SURCHARGE',
          message: `Surcharge key ${surchargeKey} not declared on position ${lineInput.positionKey}`,
        } as QuoteError;
      }
      appliedSurcharges.push({
        key: surcharge.key,
        label: surcharge.label,
        amountCents: surcharge.flatCents ?? 0,
      });
    }

    // 4. Zeilenberechnung
    // lineNet = quantity × netPrice
    const lineNetCents = lineInput.quantity * position.netPriceCents;

    // Zuschläge: Flats summieren, dann Prozente multiplikativ verketten
    let surchargeNetCents = lineNetCents;

    // Flat-Zuschläge summieren
    let flatSurchargeCents = 0;
    for (const surchargeKey of requestedKeys) {
      const surcharge = position.surcharges.find((s) => s.key === surchargeKey);
      if (surcharge?.flatCents !== null && surcharge?.flatCents !== undefined) {
        flatSurchargeCents += surcharge.flatCents;
      }
    }
    surchargeNetCents += flatSurchargeCents;

    // Prozent-Zuschläge multiplikativ verketten
    for (const surchargeKey of requestedKeys) {
      const surcharge = position.surcharges.find((s) => s.key === surchargeKey);
      if (surcharge?.percent !== null && surcharge?.percent !== undefined) {
        const percentAmount = Math.round(surchargeNetCents * Number(surcharge.percent));
        surchargeNetCents += percentAmount;
        appliedSurcharges.find((s) => s.key === surchargeKey)!.amountCents = percentAmount;
      }
    }

    const totalNetCents = surchargeNetCents;

    // 5. MwSt berechnen — runden auf ganze Cents
    const vatRate = Number(position.vatRate);
    const vatCents = Math.round(totalNetCents * vatRate);
    const totalGrossCents = totalNetCents + vatCents;

    results.push({
      positionKey: position.key,
      label: position.label,
      quantity: lineInput.quantity,
      unitNetCents: position.netPriceCents,
      lineNetCents,
      appliedSurcharges,
      appliedDiscounts: [], // wird nach Rabatt-Berechnung gefüllt
      totalNetCents,
      vatRate,
      vatCents,
      totalGrossCents,
    });
  }

  // 6. Katalog-Rabatte anwenden
  let totalDiscountCents = 0;

  for (const discount of version.discounts) {
    // Welche Zeilen betrifft dieser Rabatt?
    const affectedLines =
      discount.appliesTo === 'subtotal'
        ? results
        : results.filter((r) =>
            (discount.appliesTo as { positionKeys: string[] }).positionKeys.includes(r.positionKey),
          );

    const base = affectedLines.reduce((sum, l) => sum + l.totalNetCents, 0);

    let discountAmount: number;
    if (discount.flatCents !== null && discount.flatCents !== undefined) {
      discountAmount = discount.flatCents;
    } else {
      // Prozent-Rabatt
      discountAmount = Math.round(base * Number(discount.percent));
      // Cap anwenden
      if (discount.capCents !== null && discount.capCents !== undefined) {
        discountAmount = Math.min(discountAmount, discount.capCents);
      }
    }

    totalDiscountCents += discountAmount;

    // Rabatt proportional auf betroffene Zeilen verteilen
    if (base > 0) {
      for (const line of affectedLines) {
        const share = Math.round((line.totalNetCents / base) * discountAmount);
        line.totalNetCents -= share;
        line.appliedDiscounts.push({
          key: discount.key,
          label: discount.label,
          amountCents: share,
        });
        // MwSt neu berechnen nach Rabatt
        line.vatCents = Math.round(line.totalNetCents * line.vatRate);
        line.totalGrossCents = line.totalNetCents + line.vatCents;
      }
    }
  }

  // 7. MwSt-Gruppen berechnen
  const vatGroupMap = new Map<number, VatGroupResult>();
  for (const line of results) {
    const existing = vatGroupMap.get(line.vatRate);
    if (existing) {
      existing.netCents += line.totalNetCents;
      existing.vatCents += line.vatCents;
      existing.grossCents += line.totalGrossCents;
    } else {
      vatGroupMap.set(line.vatRate, {
        vatRate: line.vatRate,
        netCents: line.totalNetCents,
        vatCents: line.vatCents,
        grossCents: line.totalGrossCents,
      });
    }
  }

  // 8. Totals berechnen
  const totalNetCents = results.reduce((sum, l) => sum + l.totalNetCents, 0);
  const totalVatCents = results.reduce((sum, l) => sum + l.vatCents, 0);
  const totalGrossCents = results.reduce((sum, l) => sum + l.totalGrossCents, 0);

  return {
    lines: results,
    vatGroups: Array.from(vatGroupMap.values()),
    totalNetCents,
    totalDiscountCents,
    totalVatCents,
    totalGrossCents,
  };
}
