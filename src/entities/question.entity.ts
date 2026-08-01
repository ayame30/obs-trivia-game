import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { AnswerChoice } from '../common/constants';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  text!: string;

  @Column({ name: 'option_a', type: 'text' })
  optionA!: string;

  @Column({ name: 'option_b', type: 'text' })
  optionB!: string;

  @Column({ name: 'option_c', type: 'text' })
  optionC!: string;

  @Column({ name: 'option_d', type: 'text' })
  optionD!: string;

  @Column({ name: 'correct_answer', type: 'text' })
  correctAnswer!: AnswerChoice;

  @Column({ name: 'countdown_seconds', type: 'integer', default: 30 })
  countdownSeconds!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: Date;
}
