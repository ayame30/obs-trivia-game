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

export interface AppSettingsValues {
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  overlayCustomCss: string;
  updatedAt: string;
}

export type UpdateAppSettingsInput = Partial<{
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  overlayCustomCss: string;
}>;

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

    if (input.showQuestionChat !== undefined) {
      await this.setValue(SETTINGS_KEYS.showQuestionChat, input.showQuestionChat ? 'true' : 'false');
    }
    if (input.questionChatTemplate !== undefined) {
      const template = input.questionChatTemplate.trim();
      if (!template) throw new Error('Question chat template cannot be empty');
      await this.setValue(SETTINGS_KEYS.questionChatTemplate, template);
    }
    if (input.showCutoffChat !== undefined) {
      await this.setValue(SETTINGS_KEYS.showCutoffChat, input.showCutoffChat ? 'true' : 'false');
    }
    if (input.cutoffChatMessage !== undefined) {
      const message = input.cutoffChatMessage.trim();
      if (!message) throw new Error('Cutoff chat message cannot be empty');
      await this.setValue(SETTINGS_KEYS.cutoffChatMessage, message);
    }
    if (input.scoreMultiplier !== undefined) {
      const multiplier = Number(input.scoreMultiplier);
      if (!Number.isFinite(multiplier) || !Number.isInteger(multiplier) || multiplier <= 0) {
        throw new Error('Score multiplier must be a positive integer');
      }
      await this.setValue(SETTINGS_KEYS.scoreMultiplier, String(multiplier));
    }
    if (input.overlayCustomCss !== undefined) {
      await this.setValue(SETTINGS_KEYS.overlayCustomCss, input.overlayCustomCss);
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

    const latestUpdated = rows.reduce<string | null>((latest, row) => {
      const at = String(row.updatedAt ?? '');
      if (!latest || at > latest) return at;
      return latest;
    }, null);

    const scoreMultiplier = Number(get(SETTINGS_KEYS.scoreMultiplier));
    const values: AppSettingsValues = {
      showQuestionChat: get(SETTINGS_KEYS.showQuestionChat) !== 'false',
      questionChatTemplate: get(SETTINGS_KEYS.questionChatTemplate) || DEFAULT_QUESTION_CHAT_TEMPLATE,
      showCutoffChat: get(SETTINGS_KEYS.showCutoffChat) !== 'false',
      cutoffChatMessage: get(SETTINGS_KEYS.cutoffChatMessage) || DEFAULT_CUTOFF_CHAT_MESSAGE,
      scoreMultiplier:
        Number.isInteger(scoreMultiplier) && scoreMultiplier > 0
          ? scoreMultiplier
          : DEFAULT_SCORE_MULTIPLIER,
      overlayCustomCss: get(SETTINGS_KEYS.overlayCustomCss) ?? '',
      updatedAt: latestUpdated || new Date().toISOString(),
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
    const names = new Set(cols.map((col) => col.name));
    if (names.has('key') && names.has('value') && !names.has('show_question_chat')) {
      return;
    }
    if (!names.has('show_question_chat')) return;

    const oldRows = (await this.dataSource.query(
      `SELECT * FROM app_settings LIMIT 1`
    )) as Array<Record<string, unknown>>;
    const old = oldRows[0];

    await this.dataSource.query(`DROP TABLE IF EXISTS app_settings`);
    await this.dataSource.synchronize();

    if (!old) return;

    const asBoolString = (value: unknown) =>
      value === 0 || value === false || value === '0' ? 'false' : 'true';

    await this.setValue(SETTINGS_KEYS.showQuestionChat, asBoolString(old.show_question_chat));
    await this.setValue(
      SETTINGS_KEYS.questionChatTemplate,
      String(old.question_chat_template ?? DEFAULT_QUESTION_CHAT_TEMPLATE)
    );
    await this.setValue(SETTINGS_KEYS.showCutoffChat, asBoolString(old.show_cutoff_chat));
    await this.setValue(
      SETTINGS_KEYS.cutoffChatMessage,
      String(old.cutoff_chat_message ?? DEFAULT_CUTOFF_CHAT_MESSAGE)
    );
    await this.setValue(
      SETTINGS_KEYS.scoreMultiplier,
      String(old.score_multiplier ?? DEFAULT_SCORE_MULTIPLIER)
    );
  }
}
