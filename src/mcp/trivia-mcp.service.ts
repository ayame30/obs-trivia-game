import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AnswerChoice } from '../common/constants';
import { QuestionsService } from '../questions/questions.service';
import { SettingsService } from '../settings/settings.service';
import { OVERLAY_CSS_STYLE_GUIDE, sanitizeOverlayCss } from './overlay-css-style-guide';
import { QUESTION_WRITING_GUIDE } from './question-writing-guide';

function textResult(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    isError,
  };
}

function parseAnswerChoice(value: string): AnswerChoice | null {
  const v = String(value ?? '')
    .trim()
    .toUpperCase();
  if (v === 'A' || v === 'B' || v === 'C' || v === 'D') return v as AnswerChoice;
  return null;
}

@Injectable()
export class TriviaMcpService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly questionsService: QuestionsService
  ) {}

  async handlePost(req: Request, res: Response): Promise<void> {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    const { z } = await import('zod');

    const server = new McpServer({
      name: 'obs-trivia-game',
      version: '1.0.0',
    });

    server.registerTool(
      'get_mcp_endpoint',
      {
        title: 'Get MCP endpoint',
        description: 'Returns this HTTP MCP path (relative to the Obs Trivia API origin).',
      },
      async () => textResult('/mcp')
    );

    // —— Overlay CSS ——
    server.registerTool(
      'get_overlay_style_guide',
      {
        title: 'Overlay CSS style guide',
        description:
          'Returns safe overlay CSS selectors and rules for Obs Trivia OBS overlays. Prefer these selectors when generating overrides.',
      },
      async () => textResult(OVERLAY_CSS_STYLE_GUIDE)
    );

    server.registerTool(
      'get_overlay_css',
      {
        title: 'Get overlay custom CSS',
        description: 'Reads the current overlayCustomCss setting from Obs Trivia.',
      },
      async () => {
        try {
          const settings = await this.settingsService.getSettings();
          return textResult(
            JSON.stringify(
              {
                overlayCustomCss: settings.overlayCustomCss ?? '',
                updatedAt: settings.updatedAt,
              },
              null,
              2
            )
          );
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    server.registerTool(
      'set_overlay_css',
      {
        title: 'Set overlay custom CSS',
        description:
          'Replaces overlayCustomCss. Pass the full CSS document. Overlays poll and apply within a few seconds.',
        inputSchema: {
          css: z.string().describe('Full overlay custom CSS to save (replacement, not a patch).'),
        },
      },
      async ({ css }: { css: string }) => {
        try {
          const cleaned = sanitizeOverlayCss(css);
          const saved = await this.settingsService.updateSettings({
            overlayCustomCss: cleaned,
          });
          return textResult(
            JSON.stringify(
              {
                ok: true,
                overlayCustomCss: saved.overlayCustomCss ?? cleaned,
                updatedAt: saved.updatedAt,
                note: 'Overlays refresh custom CSS within ~5s (or refresh the OBS browser source).',
              },
              null,
              2
            )
          );
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    // —— Question CRUD ——
    server.registerTool(
      'get_question_writing_guide',
      {
        title: 'Question writing guide',
        description:
          'Layout rules for question/answer text on the OBS overlay (box sizes, 1–2 lines, when to use \\n). Read this before create_question or update_question.',
      },
      async () => textResult(QUESTION_WRITING_GUIDE)
    );

    server.registerTool(
      'list_questions',
      {
        title: 'List questions',
        description:
          'Lists questions from the question bank with offset pagination (same as the Questions page).',
        inputSchema: {
          offset: z.number().int().min(0).optional().describe('Skip count (default 0)'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Page size 1–100 (default 10)'),
        },
      },
      async ({ offset, limit }: { offset?: number; limit?: number }) => {
        try {
          const page = await this.questionsService.findPage(offset ?? 0, limit ?? 10);
          return textResult(JSON.stringify(page, null, 2));
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    server.registerTool(
      'get_question',
      {
        title: 'Get question',
        description: 'Fetches one question by numeric id.',
        inputSchema: {
          id: z.union([z.number().int().positive(), z.string()]).describe('Question id'),
        },
      },
      async ({ id }: { id: number | string }) => {
        try {
          const question = await this.questionsService.findOne(Number(id));
          if (!question) {
            return textResult(`Question ${id} not found.`, true);
          }
          return textResult(JSON.stringify(question, null, 2));
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    server.registerTool(
      'create_question',
      {
        title: 'Create question',
        description:
          'Creates a question. Max 2 lines per field (\\n allowed). Overlay fit boxes: question 768×80px, each answer 364×80px; font auto-scales — insert a line break when it keeps text larger/clearer. Prefer get_question_writing_guide first. correctAnswer A|B|C|D; optional countdownSeconds 5–600.',
        inputSchema: {
          text: z
            .string()
            .min(1)
            .describe(
              'Question text (max 2 lines). Fits in 768×80px with auto font size; use \\n if a break helps.'
            ),
          optionA: z
            .string()
            .min(1)
            .describe('Option A (max 2 lines). Fits in 364×80px; use \\n if needed.'),
          optionB: z
            .string()
            .min(1)
            .describe('Option B (max 2 lines). Fits in 364×80px; use \\n if needed.'),
          optionC: z
            .string()
            .min(1)
            .describe('Option C (max 2 lines). Fits in 364×80px; use \\n if needed.'),
          optionD: z
            .string()
            .min(1)
            .describe('Option D (max 2 lines). Fits in 364×80px; use \\n if needed.'),
          correctAnswer: z.enum(['A', 'B', 'C', 'D']),
          countdownSeconds: z.number().int().min(5).max(600).optional(),
        },
      },
      async (input: {
        text: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
        correctAnswer: string;
        countdownSeconds?: number;
      }) => {
        try {
          const correctAnswer = parseAnswerChoice(input.correctAnswer);
          if (!correctAnswer) {
            return textResult('correctAnswer must be A, B, C, or D.', true);
          }
          const created = await this.questionsService.create({
            text: input.text.trim(),
            optionA: input.optionA.trim(),
            optionB: input.optionB.trim(),
            optionC: input.optionC.trim(),
            optionD: input.optionD.trim(),
            correctAnswer,
            countdownSeconds: input.countdownSeconds,
          });
          return textResult(JSON.stringify({ ok: true, question: created }, null, 2));
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    server.registerTool(
      'update_question',
      {
        title: 'Update question',
        description:
          'Updates fields on an existing question. Same 2-line / fit-box rules as create_question (question 768×80, answers 364×80). Only provided fields change.',
        inputSchema: {
          id: z.union([z.number().int().positive(), z.string()]).describe('Question id'),
          text: z
            .string()
            .min(1)
            .optional()
            .describe('Question text (max 2 lines, 768×80px fit box)'),
          optionA: z.string().min(1).optional().describe('Option A (max 2 lines, 364×80px)'),
          optionB: z.string().min(1).optional().describe('Option B (max 2 lines, 364×80px)'),
          optionC: z.string().min(1).optional().describe('Option C (max 2 lines, 364×80px)'),
          optionD: z.string().min(1).optional().describe('Option D (max 2 lines, 364×80px)'),
          correctAnswer: z.enum(['A', 'B', 'C', 'D']).optional(),
          countdownSeconds: z.number().int().min(5).max(600).optional(),
        },
      },
      async (input: {
        id: number | string;
        text?: string;
        optionA?: string;
        optionB?: string;
        optionC?: string;
        optionD?: string;
        correctAnswer?: string;
        countdownSeconds?: number;
      }) => {
        try {
          const fields: {
            text?: string;
            optionA?: string;
            optionB?: string;
            optionC?: string;
            optionD?: string;
            correctAnswer?: AnswerChoice;
            countdownSeconds?: number;
          } = {};
          if (input.text !== undefined) fields.text = input.text.trim();
          if (input.optionA !== undefined) fields.optionA = input.optionA.trim();
          if (input.optionB !== undefined) fields.optionB = input.optionB.trim();
          if (input.optionC !== undefined) fields.optionC = input.optionC.trim();
          if (input.optionD !== undefined) fields.optionD = input.optionD.trim();
          if (input.countdownSeconds !== undefined) {
            fields.countdownSeconds = input.countdownSeconds;
          }
          if (input.correctAnswer !== undefined) {
            const correctAnswer = parseAnswerChoice(input.correctAnswer);
            if (!correctAnswer) {
              return textResult('correctAnswer must be A, B, C, or D.', true);
            }
            fields.correctAnswer = correctAnswer;
          }
          const updated = await this.questionsService.update(Number(input.id), fields);
          if (!updated) {
            return textResult(`Question ${input.id} not found.`, true);
          }
          return textResult(JSON.stringify({ ok: true, question: updated }, null, 2));
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    server.registerTool(
      'delete_question',
      {
        title: 'Delete question',
        description:
          'Permanently deletes a question by id. Fails if that question is in an active round — stop/reveal the round first.',
        inputSchema: {
          id: z.union([z.number().int().positive(), z.string()]).describe('Question id'),
        },
      },
      async ({ id }: { id: number | string }) => {
        try {
          const ok = await this.questionsService.delete(Number(id));
          if (!ok) {
            return textResult(`Question ${id} not found.`, true);
          }
          return textResult(JSON.stringify({ ok: true, deletedId: String(id) }, null, 2));
        } catch (err) {
          return textResult(err instanceof Error ? err.message : String(err), true);
        }
      }
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await transport.handleRequest(req, res, req.body);
  }
}
