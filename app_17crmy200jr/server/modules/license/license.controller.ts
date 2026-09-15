import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import type { Request } from "express";
import { LicenseService } from "./license.service";
import type {
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateLicenseAssignmentDto,
} from "@shared/api.interface";

@Controller("api/licenses")
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
  ) {}

  @Get()
  async list(
    @Query("keyword") keyword?: string,
    @Query("software_type") softwareType?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    let pageSizeNum = pageSize
      ? parseInt(pageSize, 10)
      : 20;
    if (pageSizeNum > 100) pageSizeNum = 100;
    if (pageSizeNum < 1) pageSizeNum = 20;

    return this.licenseService.list(
      keyword,
      softwareType,
      pageNum,
      pageSizeNum,
    );
  }

  @NeedLogin()
  @Post()
  async create(@Body() body: CreateLicenseDto) {
    return this.licenseService.create(body);
  }

  @NeedLogin()
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateLicenseDto,
  ) {
    return this.licenseService.update(id, body);
  }

  @NeedLogin()
  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.licenseService.delete(id);
    return { success: true };
  }

  @Get(":id/assignments")
  async getAssignments(@Param("id") id: string) {
    return this.licenseService.getAssignments(id);
  }

  @NeedLogin()
  @Post(":id/assignments")
  async assignSeat(
    @Param("id") id: string,
    @Body() body: CreateLicenseAssignmentDto,
    @Req() req: Request,
  ) {
    const { userId } = req.userContext;
    return this.licenseService.assignSeat(id, body, userId);
  }

  @NeedLogin()
  @Patch("assignments/:id/revoke")
  async revokeSeat(@Param("id") id: string) {
    await this.licenseService.revokeSeat(id);
    return { success: true };
  }
}