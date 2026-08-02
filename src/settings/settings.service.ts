import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AppSettings,
  DEFAULT_CUTOFF_CHAT_MESSAGE,
  DEFAULT_QUESTION_CHAT_TEMPLATE,
  DEFAULT_SCORE_MULTIPLIER,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  type SettingKey,
} from '../entities/app-settings.entity';
import {
  BOOLEAN_FIELDS,
  REQUIRED_STRING_FIELDS,
  type AppSettingsValues,
  type UpdateAppSettingsInput,
} from './settings.types';

export type { AppSettingsValues, UpdateAppSettingsInput } from './settings.types';

function parseScoreMultiplier(raw: string): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_SCORE_MULTIPLIER;
}

function latestUpdatedAt(rows: Array<{ updatedAt?: Date | string | null }>): string {
  let latest: string | null = null;
  for (const row of rows) {
    const at = String(row.updatedAt ?? '');
    if (!latest || at > latest) latest = at;
  }
  return latest || new Date().toISOString();
}

function asBoolString(value: unknown): string {
  return value === 0 || value === false || value === '0' ? 'false' : 'true';
}

function isKeyValueSettingsSchema(columns: Set<string>): boolean {
  return columns.has('key') && columns.has('value') && !columns.has('show_question_chat');
}

function isLegacyWideSettingsSchema(columns: Set<string>): boolean {
  return columns.has('show_question_chat');
}

type WideMigrationField = {
  column: string;
  settingKey: SettingKey;
  toValue: (raw: unknown) => string;
};

const WIDE_TABLE_MIGRATION_FIELDS: WideMigrationField[] = [
  {
    column: 'show_question_chat',
    settingKey: SETTINGS_KEYS.showQuestionChat,
    toValue: asBoolString,
  },
  {
    column: 'question_chat_template',
    settingKey: SETTINGS_KEYS.questionChatTemplate,
    toValue: (raw) => String(raw ?? DEFAULT_QUESTION_CHAT_TEMPLATE),
  },
  {
    column: 'show_cutoff_chat',
    settingKey: SETTINGS_KEYS.showCutoffChat,
    toValue: asBoolString,
  },
  {
    column: 'cutoff_chat_message',
    settingKey: SETTINGS_KEYS.cutoffChatMessage,
    toValue: (raw) => String(raw ?? DEFAULT_CUTOFF_CHAT_MESSAGE),
  },
  {
    column: 'score_multiplier',
    settingKey: SETTINGS_KEYS.scoreMultiplier,
    toValue: (raw) => String(raw ?? DEFAULT_SCORE_MULTIPLIER),
  },
];

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
      const multiplier = Number(input.scoreMultiplier);
      if (!Number.isFinite(multiplier) || !Number.isInteger(multiplier) || multiplier <= 0) {
        throw new Error('Score multiplier must be a positive integer');
      }
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

    const previousDefault = [
      'Q{{round}}: {{question}}',
      'A ) {{answerA}}',
      'B ) {{answerB}}',
      'C ) {{answerC}}',
      'D ) {{answerD}}',
    ].join('\n');
    const templateRow = await this.settingsRepo.findOne({
      where: { key: SETTINGS_KEYS.questionChatTemplate },
    });
    if (templateRow?.value === previousDefault) {
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

    const booleans = Object.fromEntries(
      BOOLEAN_FIELDS.map((field) => [field.inputKey, get(field.settingKey) !== 'false'])
    ) as Pick<AppSettingsValues, (typeof BOOLEAN_FIELDS)[number]['inputKey']>;

    const strings = Object.fromEntries(
      REQUIRED_STRING_FIELDS.map((field) => [
        field.inputKey,
        get(field.settingKey) || SETTINGS_DEFAULTS[field.settingKey],
      ])
    ) as Pick<AppSettingsValues, (typeof REQUIRED_STRING_FIELDS)[number]['inputKey']>;

    const values: AppSettingsValues = {
      ...booleans,
      ...strings,
      scoreMultiplier: parseScoreMultiplier(get(SETTINGS_KEYS.scoreMultiplier)),
      overlayCustomCss: get(SETTINGS_KEYS.overlayCustomCss) ?? '',
      updatedAt: latestUpdatedAt(rows),
    };
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
      await this.setValue(field.settingKey, field.toValue(old[field.column]));
    }
  }
}
