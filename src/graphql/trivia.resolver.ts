import { Inject } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
  Subscription,
  Int,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB, TOPICS } from '../common/constants';
import { RoundStatus } from '../common/constants';
import {
  CreateQuestionInput,
  QuestionModel,
  RoundModel,
  ScoreboardEntryModel,
  ScoreboardUpdateInput,
  TwitchConfigModel,
  UpdateAppSettingsInput,
  AppSettingsModel,
  UpdateQuestionInput,
  VoteCountsModel,
} from './models';
import { QuestionsService } from '../questions/questions.service';
import { RoundsService } from '../rounds/rounds.service';
import { RoundEventsService } from '../rounds/round-events.service';
import { ScoreboardService } from '../scoreboard/scoreboard.service';
import { SettingsService } from '../settings/settings.service';
import { TwitchConfigService } from '../twitch/twitch-config.service';
import { TwitchOAuthService } from '../twitch/twitch-oauth.service';
import { TwitchChatMonitorService } from '../twitch/twitch-chat-monitor.service';

@Resolver(() => RoundModel)
export class TriviaResolver {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly roundsService: RoundsService,
    private readonly roundEventsService: RoundEventsService,
    private readonly scoreboardService: ScoreboardService,
    private readonly settingsService: SettingsService,
    private readonly twitchConfigService: TwitchConfigService,
    private readonly twitchOAuthService: TwitchOAuthService,
    private readonly chatMonitor: TwitchChatMonitorService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub
  ) {}

  @Query(() => [QuestionModel])
  questions() {
    return this.questionsService.findAll();
  }

  @Query(() => QuestionModel, { nullable: true })
  question(@Args('id', { type: () => ID }) id: string) {
    return this.questionsService.findOne(Number(id));
  }

  @Query(() => RoundModel, { nullable: true })
  async activeRound() {
    const round = await this.roundsService.findActive();
    return this.roundsService.mapRound(round);
  }

  @Query(() => TwitchConfigModel, { nullable: true })
  async twitchConfig() {
    const config = await this.twitchConfigService.getConfig();
    if (!config) return null;
    return {
      ...config,
      chatConnected: this.chatMonitor.isConnected(),
    };
  }

  @Query(() => [ScoreboardEntryModel])
  scoreboard() {
    return this.scoreboardService.findAll();
  }

  @Query(() => AppSettingsModel)
  appSettings() {
    return this.settingsService.getSettings();
  }

  @Mutation(() => AppSettingsModel)
  updateAppSettings(@Args('input') input: UpdateAppSettingsInput) {
    return this.settingsService.updateSettings(input);
  }

  @Mutation(() => QuestionModel)
  createQuestion(@Args('input') input: CreateQuestionInput) {
    return this.questionsService.create(input);
  }

  @Mutation(() => QuestionModel, { nullable: true })
  updateQuestion(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateQuestionInput
  ) {
    return this.questionsService.update(Number(id), input);
  }

  @Mutation(() => Boolean)
  deleteQuestion(@Args('id', { type: () => ID }) id: string) {
    return this.questionsService.delete(Number(id));
  }

  @Mutation(() => TwitchConfigModel)
  async setTwitchToken(
    @Args('accessToken') accessToken: string,
    @Args('channel', { nullable: true }) channel?: string
  ) {
    const user = await this.twitchOAuthService.validateToken(accessToken);
    const login = user.login;
    const config = await this.twitchConfigService.setConfig({
      accessToken,
      login,
      userId: String(user.user_id),
      channel: (channel || login).replace(/^#/, '').toLowerCase(),
    });
    await this.chatMonitor.connect();
    return {
      ...config,
      chatConnected: this.chatMonitor.isConnected(),
    };
  }

  @Mutation(() => RoundModel)
  async startQuestion(@Args('questionId', { type: () => ID }) questionId: string) {
    const round = await this.roundsService.startRound(Number(questionId));
    this.chatMonitor.onQuestionStarted(round);
    return this.roundEventsService.publishQuestionStarted(round);
  }

  @Mutation(() => RoundModel)
  async stopQuestion() {
    const active = await this.roundsService.findActive();
    if (!active) throw new Error('No active question round');
    const round = await this.roundsService.stopRound(active.id);
    this.chatMonitor.onQuestionEnded(round);
    const mapped = await this.roundEventsService.publishQuestionEnded(round);
    await this.roundEventsService.publishScoreboard();
    return mapped;
  }

  @Mutation(() => RoundModel)
  async pauseCountdown() {
    const active = await this.roundsService.findActive();
    if (!active) throw new Error('No active question round');
    const round = await this.roundsService.pauseCountdown(active.id);
    this.chatMonitor.onCountdownUpdated(round);
    return this.roundEventsService.publishCountdownUpdated(round);
  }

  @Mutation(() => RoundModel)
  async resumeCountdown() {
    const active = await this.roundsService.findActive();
    if (!active) throw new Error('No active question round');
    const round = await this.roundsService.resumeCountdown(active.id);
    this.chatMonitor.onCountdownUpdated(round);
    return this.roundEventsService.publishCountdownUpdated(round);
  }

  @Mutation(() => [ScoreboardEntryModel])
  async resetScoreboard() {
    await this.scoreboardService.reset();
    return this.roundEventsService.publishScoreboard();
  }

  @Mutation(() => [ScoreboardEntryModel])
  async updateScoreboard(@Args('updates', { type: () => [ScoreboardUpdateInput] }) updates: ScoreboardUpdateInput[]) {
    await this.scoreboardService.batchUpdate(updates);
    return this.roundEventsService.publishScoreboard();
  }

  @Mutation(() => Boolean)
  async resetRounds() {
    await this.roundsService.resetRounds();
    await this.roundEventsService.publishRoundsReset();
    return true;
  }

  @Mutation(() => Boolean)
  reconnectTwitchChat() {
    return this.chatMonitor.connect();
  }

  @Mutation(() => Boolean)
  sendTwitchChatMessage(@Args('message') message: string) {
    return this.chatMonitor.sendMessage(message);
  }

  @Subscription(() => RoundModel)
  questionStarted() {
    return this.pubSub.asyncIterableIterator(TOPICS.QUESTION_STARTED);
  }

  @Subscription(() => VoteCountsModel)
  voteCountsUpdated() {
    return this.pubSub.asyncIterableIterator(TOPICS.VOTE_COUNTS_UPDATED);
  }

  @Subscription(() => RoundModel)
  countdownUpdated() {
    return this.pubSub.asyncIterableIterator(TOPICS.COUNTDOWN_UPDATED);
  }

  @Subscription(() => RoundModel)
  questionEnded() {
    return this.pubSub.asyncIterableIterator(TOPICS.QUESTION_ENDED);
  }

  @Subscription(() => [ScoreboardEntryModel])
  scoreboardUpdated() {
    return this.pubSub.asyncIterableIterator(TOPICS.SCOREBOARD_UPDATED);
  }

  @Subscription(() => Boolean)
  roundsReset() {
    return this.pubSub.asyncIterableIterator(TOPICS.ROUNDS_RESET);
  }

  @ResolveField(() => VoteCountsModel)
  async voteCounts(@Parent() round: RoundModel) {
    return this.roundsService.getVoteCounts(Number(round.id));
  }

  @ResolveField(() => Int)
  countdownRemainingSeconds(@Parent() round: RoundModel) {
    if (round.status !== RoundStatus.active) return 0;
    if (round.countdownPaused) {
      return round.countdownRemainingSeconds ?? 0;
    }
    if (round.countdownEndsAt) {
      return Math.max(
        0,
        Math.ceil((new Date(round.countdownEndsAt).getTime() - Date.now()) / 1000)
      );
    }
    return round.countdownRemainingSeconds ?? round.countdownSeconds ?? 0;
  }
}
