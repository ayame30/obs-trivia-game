import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import {
  AppSettings,
  Question,
  Round,
  ScoreboardEntry,
  TwitchConfig,
  Vote,
} from './entities';
import { GraphqlModule } from './graphql/graphql.module';
import { HealthController } from './health/health.controller';
import { McpModule } from './mcp/mcp.module';
import { PubSubModule } from './pubsub/pubsub.module';
import { SettingsModule } from './settings/settings.module';
import { TwitchModule } from './twitch/twitch.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = resolve(
          config.get<string>('DATABASE_PATH', './data/stream-trivia.db')
        );
        mkdirSync(dirname(database), { recursive: true });
        return {
          type: 'sqljs' as const,
          location: database,
          autoSave: true,
          entities: [Question, Round, Vote, ScoreboardEntry, TwitchConfig, AppSettings],
          // Create/update tables from entity definitions (no hand-written SQL)
          synchronize: true,
        };
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // In-memory schema — avoids writing src/schema.gql in packaged Electron builds
      autoSchemaFile: true,
      sortSchema: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/graphql*path', '/health*path', '/mcp*path'],
    }),
    PubSubModule,
    SettingsModule,
    GraphqlModule,
    TwitchModule,
    McpModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
