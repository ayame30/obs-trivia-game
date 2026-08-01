import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSettings } from '../entities/app-settings.entity';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppSettings])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
