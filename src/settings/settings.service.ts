import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppSettings } from '../entities/app-settings.entity';
import {
  BOOLEAN_FIELDS,
  DEFAULT_QUESTION_CHAT_TEMPLATE,
  LEGACY_QUESTION_CHAT_TEMPLATE,
  REQUIRED_STRING_FIELDS,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  WIDE_TABLE_MIGRATION_FIELDS,
  type SettingKey,
} from './settings.constants';
import type { AppSettingsValues, UpdateAppSettingsInput } from './settings.types';
import {
  assertPositiveInteger,
  buildAppSettingsValues,
  isKeyValueSettingsSchema,
  isLegacyWideSettingsSchema,
  latestUpdatedAt,
  migrateWideFieldValue,
} from './settings.utils';

export type { AppSettingsValues, UpdateAppSettingsInput } from './settings.types';

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: AppSettingsValues | null = null;

  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepo: Repository<AppSettings>,
    private readonly dataSource: DataSource
  ) {}

  async onModuleInit() {
    await this.migrateWideTableIfNeeded();
    await this.ensureDefaults();
  }

  async getSettings(): Promise<AppSettingsValues> {
    if (this.cache) return this.cache;
    await this.ensureDefaults();
    return this.loadValues();
  }

  async updateSettings(input: UpdateAppSettingsInput): Promise<AppSettingsValues> {
    await this.ensureDefaults();

    for (const field of BOOLEAN_FIELDS) {
      const value = input[field.inputKey];
      if (value === undefined) continue;
      await this.setValue(field.settingKey, value ? 'true' : 'false');
    }

    for (const field of REQUIRED_STRING_FIELDS) {
      const raw = input[field.inputKey];
      if (raw === undefined) continue;
      const value = String(raw).trim();
      if (!value) throw new Error(`${field.label} cannot be empty`);
      await this.setValue(field.settingKey, value);
    }

    if (input.overlayCustomCss !== undefined) {
      await this.setValue(SETTINGS_KEYS.overlayCustomCss, input.overlayCustomCss);
    }

    if (input.scoreMultiplier !== undefined) {
      const multiplier = assertPositiveInteger(input.scoreMultiplier, 'Score multiplier');
      await this.setValue(SETTINGS_KEYS.scoreMultiplier, String(multiplier));
    }

    this.cache = null;
    return this.loadValues();
  }

  private async ensureDefaults(): Promise<void> {
    for (const [key, value] of Object.entries(SETTINGS_DEFAULTS) as Array<[SettingKey, string]>) {
      const existing = await this.settingsRepo.findOne({ where: { key } });
      if (!existing) {
        await this.settingsRepo.save(this.settingsRepo.create({ key, value }));
      }
    }

    const templateRow = await this.settingsRepo.findOne({
      where: { key: SETTINGS_KEYS.questionChatTemplate },
    });
    if (templateRow?.value === LEGACY_QUESTION_CHAT_TEMPLATE) {
      templateRow.value = DEFAULT_QUESTION_CHAT_TEMPLATE;
      await this.settingsRepo.save(templateRow);
    }

    this.cache = null;
  }

  private async loadValues(): Promise<AppSettingsValues> {
    const rows = await this.settingsRepo.find();
    const map = new Map(rows.map((row) => [row.key, row]));
    const get = (key: SettingKey): string =>
      map.get(key)?.value ?? SETTINGS_DEFAULTS[key];

    const values = buildAppSettingsValues(get, latestUpdatedAt(rows));
    this.cache = values;
    return values;
  }

  private async setValue(key: SettingKey, value: string): Promise<void> {
    const existing = await this.settingsRepo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      await this.settingsRepo.save(existing);
      return;
    }
    await this.settingsRepo.save(this.settingsRepo.create({ key, value }));
  }

  /** One-time move from the old single-row settings table to key/value rows. */
  private async migrateWideTableIfNeeded(): Promise<void> {
    const tables = await this.dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_settings'`
    );
    if (!tables?.length) return;

    const cols = (await this.dataSource.query(`PRAGMA table_info('app_settings')`)) as Array<{
      name: string;
    }>;
    const columns = new Set(cols.map((col) => col.name));
    if (isKeyValueSettingsSchema(columns) || !isLegacyWideSettingsSchema(columns)) {
      return;
    }

    const oldRows = (await this.dataSource.query(
      `SELECT * FROM app_settings LIMIT 1`
    )) as Array<Record<string, unknown>>;
    const old = oldRows[0];

    await this.dataSource.query(`DROP TABLE IF EXISTS app_settings`);
    await this.dataSource.synchronize();

    if (!old) return;

    for (const field of WIDE_TABLE_MIGRATION_FIELDS) {
      await this.setValue(field.settingKey, migrateWideFieldValue(field, old[field.column]));
    }
  }
}
