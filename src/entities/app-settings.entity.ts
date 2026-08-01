import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export const DEFAULT_QUESTION_CHAT_TEMPLATE =
  'Q{{round}}:  {{question}} A ) {{answerA}} B ) {{answerB}} C ) {{answerC}} D ) {{answerD}}';

export const DEFAULT_CUTOFF_CHAT_MESSAGE = '===== END =====';
export const DEFAULT_SCORE_MULTIPLIER = 10;

@Entity('app_settings')
export class AppSettings {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ name: 'show_question_chat', type: 'boolean', default: true })
  showQuestionChat!: boolean;

  @Column({
    name: 'question_chat_template',
    type: 'text',
    default: DEFAULT_QUESTION_CHAT_TEMPLATE,
  })
  questionChatTemplate!: string;

  @Column({ name: 'show_cutoff_chat', type: 'boolean', default: true })
  showCutoffChat!: boolean;

  @Column({
    name: 'cutoff_chat_message',
    type: 'text',
    default: DEFAULT_CUTOFF_CHAT_MESSAGE,
  })
  cutoffChatMessage!: string;

  @Column({ name: 'score_multiplier', type: 'integer', default: DEFAULT_SCORE_MULTIPLIER })
  scoreMultiplier!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt!: Date;
}
