import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogVersion } from './catalog-version.entity';
import { CatalogSurcharge } from './catalog-surcharge.entity';

export enum PositionUnit {
  PIECE = 'piece',
  M2 = 'm2',
  METER = 'meter',
  HOUR = 'hour',
  FLAT = 'flat',
}

@Entity({ schema: 'pricing_service', name: 'catalog_positions' })
export class CatalogPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'enum', enum: PositionUnit })
  unit: PositionUnit;

  @Column({ name: 'net_price_cents', type: 'integer' })
  netPriceCents: number;

  @Column({ name: 'vat_rate', type: 'decimal', precision: 4, scale: 3 })
  vatRate: number;

  @Column({ name: 'min_quantity', type: 'integer', nullable: true })
  minQuantity: number | null;

  @Column({ name: 'max_quantity', type: 'integer', nullable: true })
  maxQuantity: number | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CatalogVersion, (v: CatalogVersion) => v.positions)
  @JoinColumn({ name: 'version_id' })
  version: CatalogVersion;

  @OneToMany(() => CatalogSurcharge, (s: CatalogSurcharge) => s.position, { cascade: true })
  surcharges: CatalogSurcharge[];
}
