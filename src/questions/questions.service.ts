import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  clampCountdownSeconds,
  DEFAULT_COUNTDOWN_SECONDS,
  RoundStatus,
} from '../common/constants';
import { mapQuestionEntity } from '../common/mappers';
import { Question } from '../entities/question.entity';
import { Round } from '../entities/round.entity';
import { AnswerChoice } from '../common/constants';

export interface CreateQuestionInput {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerChoice;
  countdownSeconds?: number | null;
}

export interface UpdateQuestionInput {
  text?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: AnswerChoice;
  countdownSeconds?: number | null;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(Round)
    private readonly roundRepo: Repository<Round>
  ) {}

  async findAll() {
    const rows = await this.questionRepo.find({ order: { id: 'ASC' } });
    return rows.map((row) => mapQuestionEntity(row)).filter(Boolean);
  }

  async findPage(offset = 0, limit = 10) {
    const safeOffset = Math.max(0, Math.floor(offset) || 0);
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 10));

    const [rows, total] = await this.questionRepo.findAndCount({
      order: { id: 'ASC' },
      skip: safeOffset,
      take: safeLimit,
    });

    return {
      items: rows.map((row) => mapQuestionEntity(row)).filter(Boolean),
      total,
      offset: safeOffset,
      limit: safeLimit,
    };
  }

  async findOne(id: number) {
    const row = await this.questionRepo.findOne({ where: { id } });
    return mapQuestionEntity(row);
  }

  async create(input: CreateQuestionInput) {
    const entity = this.questionRepo.create({
      text: input.text,
      optionA: input.optionA,
      optionB: input.optionB,
      optionC: input.optionC,
      optionD: input.optionD,
      correctAnswer: input.correctAnswer,
      countdownSeconds: clampCountdownSeconds(
        input.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS
      ),
    });
    const saved = await this.questionRepo.save(entity);
    return mapQuestionEntity(saved);
  }

  async update(id: number, fields: UpdateQuestionInput) {
    const existing = await this.questionRepo.findOne({ where: { id } });
    if (!existing) return null;

    Object.assign(existing, {
      text: fields.text ?? existing.text,
      optionA: fields.optionA ?? existing.optionA,
      optionB: fields.optionB ?? existing.optionB,
      optionC: fields.optionC ?? existing.optionC,
      optionD: fields.optionD ?? existing.optionD,
      correctAnswer: fields.correctAnswer ?? existing.correctAnswer,
      countdownSeconds:
        fields.countdownSeconds !== undefined && fields.countdownSeconds !== null
          ? clampCountdownSeconds(fields.countdownSeconds)
          : existing.countdownSeconds,
    });

    const saved = await this.questionRepo.save(existing);
    return mapQuestionEntity(saved);
  }

  async delete(id: number): Promise<boolean> {
    const activeRound = await this.roundRepo.findOne({
      where: { status: RoundStatus.active, questionId: id },
    });
    if (activeRound) {
      throw new Error('Cannot delete the question that is currently in an active round.');
    }

    const result = await this.questionRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findEntity(id: number): Promise<Question | null> {
    return this.questionRepo.findOne({ where: { id } });
  }
}
