import { Controller, Delete, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TriviaMcpService } from './trivia-mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly triviaMcp: TriviaMcpService) {}

  @Post()
  @HttpCode(200)
  async post(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      await this.triviaMcp.handlePost(req, res);
    } catch (error) {
      console.error('MCP /mcp error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  }

  @Get()
  @Delete()
  methodNotAllowed(@Res() res: Response): void {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp.' },
      id: null,
    });
  }
}
