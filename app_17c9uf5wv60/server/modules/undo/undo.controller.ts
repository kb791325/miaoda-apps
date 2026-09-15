import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { NeedLogin, CanRole } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { UndoService } from './undo.service';
import type { UndoRequest, UndoResponse } from '@shared/api.interface';

@Controller('api/undo')
export class UndoController {
  constructor(private readonly undoService: UndoService) {}

  @NeedLogin()
  @CanRole(['boss', 'supervisor', 'warehouse_admin'])
  @Post()
  async undo(@Body() dto: UndoRequest, @Req() req: Request): Promise<UndoResponse> {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
    if (!dto?.targetId || !uuidPattern.test(dto.targetId)) {
      throw new BadRequestException('无效的撤销目标');
    }
    const { userId } = req.userContext;
    return this.undoService.undo(dto, userId);
  }
}
