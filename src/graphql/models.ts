import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AnswerChoice, RoundStatus } from '../common/constants';

registerEnumType(AnswerChoice, { name: 'AnswerChoice' });
registerEnumType(RoundStatus, { name: 'RoundStatus' });

@ObjectType('Question')
export class QuestionModel {
  @Field(() => ID)
  id!: string;

  @Field()
  text!: string;

  @Field()
  optionA!: string;

  @Field()
  optionB!: string;

  @Field()
  optionC!: string;

  @Field()
  optionD!: string;

  @Field(() => AnswerChoice, { nullable: true })
  correctAnswer!: AnswerChoice | null;

  @Field(() => Int)
  countdownSeconds!: number;

  @Field(() => String, { nullable: true })
  createdAt!: string | null;
}

@ObjectType('QuestionsPage')
export class QuestionsPageModel {
  @Field(() => [QuestionModel])
  items!: QuestionModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  offset!: number;

  @Field(() => Int)
  limit!: number;
}

@ObjectType('VoteCounts')
export class VoteCountsModel {
  @Field(() => Int)
  A!: number;

  @Field(() => Int)
  B!: number;

  @Field(() => Int)
  C!: number;

  @Field(() => Int)
  D!: number;

  @Field(() => Int)
  total!: number;
}

@ObjectType('Round')
export class RoundModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  questionId!: string;

  @Field(() => RoundStatus)
  status!: RoundStatus;

  @Field()
  startedAt!: string;

  @Field(() => String, { nullable: true })
  endedAt!: string | null;

  @Field(() => QuestionModel)
  question!: QuestionModel;

  @Field(() => VoteCountsModel)
  voteCounts!: VoteCountsModel;

  @Field(() => Int)
  countdownSeconds!: number;

  @Field(() => Int)
  countdownRemainingSeconds!: number;

  @Field()
  countdownPaused!: boolean;

  @Field(() => String, { nullable: true })
  countdownEndsAt!: string | null;
}

@ObjectType('TwitchConfig')
export class TwitchConfigModel {
  @Field()
  login!: string;

  @Field()
  userId!: string;

  @Field()
  channel!: string;

  @Field()
  updatedAt!: string;

  @Field()
  hasToken!: boolean;

  @Field()
  chatConnected!: boolean;
}

@ObjectType('ScoreboardEntry')
export class ScoreboardEntryModel {
  @Field()
  twitchUserId!: string;

  @Field()
  displayName!: string;

  @Field(() => Int)
  score!: number;
}

@InputType()
export class CreateQuestionInput {
  @Field()
  text!: string;

  @Field()
  optionA!: string;

  @Field()
  optionB!: string;

  @Field()
  optionC!: string;

  @Field()
  optionD!: string;

  @Field(() => AnswerChoice)
  correctAnswer!: AnswerChoice;

  @Field(() => Int, { nullable: true })
  countdownSeconds?: number | null;
}

@InputType()
export class UpdateQuestionInput {
  @Field(() => String, { nullable: true })
  text?: string;

  @Field(() => String, { nullable: true })
  optionA?: string;

  @Field(() => String, { nullable: true })
  optionB?: string;

  @Field(() => String, { nullable: true })
  optionC?: string;

  @Field(() => String, { nullable: true })
  optionD?: string;

  @Field(() => AnswerChoice, { nullable: true })
  correctAnswer?: AnswerChoice;

  @Field(() => Int, { nullable: true })
  countdownSeconds?: number | null;
}

@InputType()
export class ScoreboardUpdateInput {
  @Field()
  twitchUserId!: string;

  @Field(() => String, { nullable: true })
  displayName?: string;

  @Field(() => Int, { nullable: true })
  score?: number;

  @Field(() => Int, { nullable: true })
  delta?: number;
}

@ObjectType('AppSettings')
export class AppSettingsModel {
  @Field()
  showQuestionChat!: boolean;

  @Field()
  questionChatTemplate!: string;

  @Field()
  showCutoffChat!: boolean;

  @Field()
  cutoffChatMessage!: string;

  @Field(() => Int)
  scoreMultiplier!: number;

  @Field()
  overlayCustomCss!: string;

  @Field()
  roundLabelTemplate!: string;

  @Field()
  roundLabelIdle!: string;

  @Field()
  idleQuestionText!: string;

  @Field()
  countdownLabel!: string;

  @Field()
  countdownPausedLabel!: string;

  @Field()
  countdownValueTemplate!: string;

  @Field()
  uiLocale!: string;

  @Field()
  updatedAt!: string;
}

@InputType()
export class UpdateAppSettingsInput {
  @Field({ nullable: true })
  showQuestionChat?: boolean;

  @Field({ nullable: true })
  questionChatTemplate?: string;

  @Field({ nullable: true })
  showCutoffChat?: boolean;

  @Field({ nullable: true })
  cutoffChatMessage?: string;

  @Field(() => Int, { nullable: true })
  scoreMultiplier?: number;

  @Field({ nullable: true })
  overlayCustomCss?: string;

  @Field({ nullable: true })
  roundLabelTemplate?: string;

  @Field({ nullable: true })
  roundLabelIdle?: string;

  @Field({ nullable: true })
  idleQuestionText?: string;

  @Field({ nullable: true })
  countdownLabel?: string;

  @Field({ nullable: true })
  countdownPausedLabel?: string;

  @Field({ nullable: true })
  countdownValueTemplate?: string;

  @Field({ nullable: true })
  uiLocale?: string;
}

@ObjectType()
export class StartQuestionPayload {
  @Field(() => RoundModel)
  round!: RoundModel;

  @Field(() => String, { nullable: true })
  warning!: string | null;
}
