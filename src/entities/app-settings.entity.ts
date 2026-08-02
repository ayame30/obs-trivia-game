import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export {
  DEFAULT_COUNTDOWN_LABEL,
  DEFAULT_COUNTDOWN_PAUSED_LABEL,
  DEFAULT_COUNTDOWN_VALUE_TEMPLATE,
  DEFAULT_CUTOFF_CHAT_MESSAGE,
  DEFAULT_IDLE_QUESTION_TEXT,
  DEFAULT_QUESTION_CHAT_TEMPLATE,
  DEFAULT_ROUND_LABEL_IDLE,
  DEFAULT_ROUND_LABEL_TEMPLATE,
  DEFAULT_SCORE_MULTIPLIER,
  SETTINGS_DEFAULTS,
  SETTINGS_KEYS,
  type SettingKey,
} from '../settings/settings.constants';

@Entity('app_settings')
export class AppSettings {
  @PrimaryColumn({ type: 'text' })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt!: Date;
}
