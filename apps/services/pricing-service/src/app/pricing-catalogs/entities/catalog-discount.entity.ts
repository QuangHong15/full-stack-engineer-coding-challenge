import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatalogVersion } from './catalog-version.entity';

@Entity({ schema: 'pricing_service', name: 'catalog_discounts' })
export class CatalogDiscount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ name: 'flat_cents', type: 'integer', nullable: true })
  flatCents: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  percent: number | null;

  @Column({ name: 'cap_cents', type: 'integer', nullable: true })
  capCents: number | null;

  @Column({ name: 'applies_to', type: 'jsonb' })
  appliesTo: 'subtotal' | { positionKeys: string[] };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CatalogVersion, (v: CatalogVersion) => v.discounts)
  @JoinColumn({ name: 'version_id' })
  version: CatalogVersion;
}
