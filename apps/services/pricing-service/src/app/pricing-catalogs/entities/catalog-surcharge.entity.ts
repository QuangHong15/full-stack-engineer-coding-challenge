import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatalogPosition } from './catalog-position.entity';

@Entity({ schema: 'pricing_service', name: 'catalog_surcharges' })
export class CatalogSurcharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'position_id', type: 'uuid' })
  positionId: string;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ name: 'flat_cents', type: 'integer', nullable: true })
  flatCents: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  percent: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CatalogPosition, (p: CatalogPosition) => p.surcharges)
  @JoinColumn({ name: 'position_id' })
  position: CatalogPosition;
}
