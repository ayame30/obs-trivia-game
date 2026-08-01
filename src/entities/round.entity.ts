import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RoundStatus } from '../common/constants';
import { Question } from './question.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'question_id', type: 'integer' })
  questionId!: number;

  @ManyToOne(() => Question, { eager: false })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ type: 'text', default: RoundStatus.active })
  status!: RoundStatus;

  @CreateDateColumn({ name: 'started_at', type: 'text' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'text', nullable: true })
  endedAt!: string | null;

  @Column({ name: 'countdown_seconds', type: 'integer', default: 30 })
  countdownSeconds!: number;

  @Column({ name: 'countdown_ends_at', type: 'text', nullable: true })
  countdownEndsAt!: string | null;

  @Column({ name: 'countdown_paused', type: 'integer', default: 0 })
  countdownPaused!: number;

  @Column({ name: 'countdown_remaining_ms', type: 'integer', nullable: true })
  countdownRemainingMs!: number | null;
}
