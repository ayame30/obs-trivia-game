import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('twitch_config')
export class TwitchConfig {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ name: 'access_token', type: 'text' })
  accessToken!: string;

  @Column({ type: 'text' })
  login!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  channel!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'text' })
  updatedAt!: Date;
}
