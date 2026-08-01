import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppSettings,
  DEFAULT_CUTOFF_CHAT_MESSAGE,
  DEFAULT_QUESTION_CHAT_TEMPLATE,
  DEFAULT_SCORE_MULTIPLIER,
} from '../entities/app-settings.entity';

export interface AppSettingsValues {
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
  updatedAt: string;
}

export type UpdateAppSettingsInput = Partial<{
  showQuestionChat: boolean;
  questionChatTemplate: string;
  showCutoffChat: boolean;
  cutoffChatMessage: string;
  scoreMultiplier: number;
}>;

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: AppSettingsValues | null = null;

  constructor(
    @InjectRepository(AppSettings)
    private readonly settingsRepo: Repository<AppSettings>
  ) {}

  async onModuleInit() {
    await this.settingsRepo.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY NOT NULL,
        show_question_chat INTEGER NOT NULL DEFAULT 1,
        question_chat_template TEXT NOT NULL,
        show_cutoff_chat INTEGER NOT NULL DEFAULT 1,
        cutoff_chat_message TEXT NOT NULL,
        score_multiplier INTEGER NOT NULL DEFAULT 10,
        updated_at TEXT NOT NULL
      )
    `);
    await this.ensureDefaults();
  }

  async getSettings(): Promise<AppSettingsValues> {
    if (this.cache) return this.cache;
    const row = await this.ensureDefaults();
    return this.toValues(row);
  }

  async updateSettings(input: UpdateAppSettingsInput): Promise<AppSettingsValues> {
    const row = await this.ensureDefaults();

    if (input.showQuestionChat !== undefined) {
      row.showQuestionChat = Boolean(input.showQuestionChat);
    }
    if (input.questionChatTemplate !== undefined) {
      const template = input.questionChatTemplate.trim();
      if (!template) throw new Error('Question chat template cannot be empty');
      row.questionChatTemplate = template;
    }
    if (input.showCutoffChat !== undefined) {
      row.showCutoffChat = Boolean(input.showCutoffChat);
    }
    if (input.cutoffChatMessage !== undefined) {
      const message = input.cutoffChatMessage.trim();
      if (!message) throw new Error('Cutoff chat message cannot be empty');
      row.cutoffChatMessage = message;
    }
    if (input.scoreMultiplier !== undefined) {
      const multiplier = Number(input.scoreMultiplier);
      if (!Number.isFinite(multiplier) || !Number.isInteger(multiplier) || multiplier <= 0) {
        throw new Error('Score multiplier must be a positive integer');
      }
      row.scoreMultiplier = multiplier;
    }

    const saved = await this.settingsRepo.save(row);
    this.cache = this.toValues(saved);
    return this.cache;
  }

  private async ensureDefaults(): Promise<AppSettings> {
    const previousDefault = [
      'Q{{round}}: {{question}}',
      'A ) {{answerA}}',
      'B ) {{answerB}}',
      'C ) {{answerC}}',
      'D ) {{answerD}}',
    ].join('\n');

    let row = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.settingsRepo.create({
        id: 1,
        showQuestionChat: true,
        questionChatTemplate: DEFAULT_QUESTION_CHAT_TEMPLATE,
        showCutoffChat: true,
        cutoffChatMessage: DEFAULT_CUTOFF_CHAT_MESSAGE,
        scoreMultiplier: DEFAULT_SCORE_MULTIPLIER,
      });
      row = await this.settingsRepo.save(row);
    } else if (row.questionChatTemplate === previousDefault) {
      row.questionChatTemplate = DEFAULT_QUESTION_CHAT_TEMPLATE;
      row = await this.settingsRepo.save(row);
    }
    this.cache = this.toValues(row);
    return row;
  }

  private toValues(row: AppSettings): AppSettingsValues {
    return {
      showQuestionChat: Boolean(row.showQuestionChat),
      questionChatTemplate: row.questionChatTemplate || DEFAULT_QUESTION_CHAT_TEMPLATE,
      showCutoffChat: Boolean(row.showCutoffChat),
      cutoffChatMessage: row.cutoffChatMessage || DEFAULT_CUTOFF_CHAT_MESSAGE,
      scoreMultiplier: row.scoreMultiplier > 0 ? row.scoreMultiplier : DEFAULT_SCORE_MULTIPLIER,
      updatedAt: String(row.updatedAt ?? new Date().toISOString()),
    };
  }
}
