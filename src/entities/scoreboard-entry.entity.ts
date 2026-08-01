import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('scoreboard')
export class ScoreboardEntry {
  @PrimaryColumn({ name: 'twitch_user_id', type: 'text' })
  twitchUserId!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ type: 'integer', default: 0 })
  score!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt!: Date;
}
