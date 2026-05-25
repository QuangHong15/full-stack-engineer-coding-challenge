import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Craftsman } from '../../craftsmen/entities/craftsman.entity';
import { CatalogPosition } from './catalog-position.entity';
import { CatalogDiscount } from './catalog-discount.entity';

export enum CatalogVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

@Entity({ schema: 'pricing_service', name: 'catalog_versions' })
export class CatalogVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'craftsman_id', type: 'uuid' })
  craftsmanId: string;

  @Column({ type: 'varchar', length: 32 })
  trade: string;

  @Column({
    type: 'enum',
    enum: CatalogVersionStatus,
    default: CatalogVersionStatus.DRAFT,
  })
  status: CatalogVersionStatus;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Beziehungen
  @ManyToOne(() => Craftsman)
  @JoinColumn({ name: 'craftsman_id' })
  craftsman: Craftsman;

  @OneToMany(() => CatalogPosition, (p: CatalogPosition) => p.version, { cascade: true })
  positions: CatalogPosition[];

  @OneToMany(() => CatalogDiscount, (d: CatalogDiscount) => d.version, { cascade: true })
  discounts: CatalogDiscount[];
}
