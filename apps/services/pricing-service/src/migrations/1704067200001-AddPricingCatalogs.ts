import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddPricingCatalogs1704067200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. catalog_versions
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_versions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'craftsman_id', type: 'uuid' },
          { name: 'trade', type: 'varchar', length: '32' },
          { name: 'status', type: 'varchar', length: '20', default: "'DRAFT'" },
          { name: 'effective_from', type: 'date' },
          { name: 'published_by', type: 'uuid', isNullable: true },
          { name: 'published_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_versions',
      new TableForeignKey({
        columnNames: ['craftsman_id'],
        referencedTableName: 'pricing_service.craftsmen',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.catalog_versions',
      new TableIndex({
        name: 'idx_catalog_versions_craftsman_trade',
        columnNames: ['craftsman_id', 'trade'],
      }),
    );

    // 2. catalog_positions
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_positions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '100' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'unit', type: 'varchar', length: '20' },
          { name: 'net_price_cents', type: 'integer' },
          { name: 'vat_rate', type: 'decimal', precision: 4, scale: 3 },
          { name: 'min_quantity', type: 'integer', isNullable: true },
          { name: 'max_quantity', type: 'integer', isNullable: true },
          { name: 'attributes', type: 'jsonb', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_positions',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'pricing_service.catalog_positions',
      new TableIndex({
        name: 'idx_catalog_positions_version_key',
        columnNames: ['version_id', 'key'],
        isUnique: true,
      }),
    );

    // 3. catalog_surcharges
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_surcharges',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'position_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '100' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'flat_cents', type: 'integer', isNullable: true },
          { name: 'percent', type: 'decimal', precision: 5, scale: 4, isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_surcharges',
      new TableForeignKey({
        columnNames: ['position_id'],
        referencedTableName: 'pricing_service.catalog_positions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 4. catalog_discounts
    await queryRunner.createTable(
      new Table({
        name: 'pricing_service.catalog_discounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'version_id', type: 'uuid' },
          { name: 'key', type: 'varchar', length: '100' },
          { name: 'label', type: 'varchar', length: '255' },
          { name: 'flat_cents', type: 'integer', isNullable: true },
          { name: 'percent', type: 'decimal', precision: 5, scale: 4, isNullable: true },
          { name: 'cap_cents', type: 'integer', isNullable: true },
          { name: 'applies_to', type: 'jsonb' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'pricing_service.catalog_discounts',
      new TableForeignKey({
        columnNames: ['version_id'],
        referencedTableName: 'pricing_service.catalog_versions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 5. pricing_schema Spalte auf trade_configs
    await queryRunner.addColumn('pricing_service.trade_configs', {
      name: 'pricing_schema',
      type: 'jsonb',
      isNullable: true,
      default: null,
    } as any);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pricing_service.trade_configs', 'pricing_schema');
    await queryRunner.dropTable('pricing_service.catalog_discounts', true);
    await queryRunner.dropTable('pricing_service.catalog_surcharges', true);
    await queryRunner.dropIndex(
      'pricing_service.catalog_positions',
      'idx_catalog_positions_version_key',
    );
    await queryRunner.dropTable('pricing_service.catalog_positions', true);
    await queryRunner.dropIndex(
      'pricing_service.catalog_versions',
      'idx_catalog_versions_craftsman_trade',
    );
    await queryRunner.dropTable('pricing_service.catalog_versions', true);
  }
}
