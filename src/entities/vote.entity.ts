import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { AnswerChoice } from '../common/constants';
import { Round } from './round.entity';

@Entity('votes')
@Unique(['roundId', 'twitchUserId'])
export class Vote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'round_id', type: 'integer' })
  roundId!: number;

  @ManyToOne(() => Round)
  @JoinColumn({ name: 'round_id' })
  round!: Round;

  @Column({ name: 'twitch_user_id', type: 'text' })
  twitchUserId!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ type: 'text' })
  answer!: AnswerChoice;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: Date;
}
