import { Controller, Get } from '@nestjs/common';
import { CanRole } from '@lark-apaas/fullstack-nestjs-core';
import { TrafficService } from './traffic.service';
import type { TrafficResponse } from '@shared/api.interface';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS } from '@shared/roles';

@Controller('api/traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @CanRole([ROLE_OPERATIONS, ROLE_SUPERVISOR, ROLE_BOSS])
  @Get()
  async findAll(): Promise<TrafficResponse> {
    return this.trafficService.findAll();
  }
}
