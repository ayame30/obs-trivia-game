import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { mapTwitchConfigEntity } from '../common/mappers';
import { TwitchConfig } from '../entities/twitch-config.entity';

@Injectable()
export class TwitchConfigService {
  constructor(
    @InjectRepository(TwitchConfig)
    private readonly configRepo: Repository<TwitchConfig>
  ) {}

  async findOne(): Promise<TwitchConfig | null> {
    return this.configRepo.findOne({ where: { id: 1 } });
  }

  async getAccessToken(): Promise<string | null> {
    const row = await this.findOne();
    return row?.accessToken ?? null;
  }

  async getConfig() {
    return mapTwitchConfigEntity(await this.findOne());
  }

  async setConfig(params: {
    accessToken: string;
    login: string;
    userId: string;
    channel: string;
  }) {
    const existing = await this.findOne();
    const entity = existing ?? this.configRepo.create({ id: 1, ...params });
    Object.assign(entity, params);
    const saved = await this.configRepo.save(entity);
    return mapTwitchConfigEntity(saved);
  }
}
