import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { NeedLogin } from "@lark-apaas/fullstack-nestjs-core";
import { SupplierService } from "./supplier.service";
import type { CreateSupplierDto, UpdateSupplierDto } from "@shared/api.interface";

@Controller("api/suppliers")
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  async list(
    @Query("keyword") keyword?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    let pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    if (pageSizeNum > 100) pageSizeNum = 100;
    if (pageSizeNum < 1) pageSizeNum = 20;

    return this.supplierService.list(keyword, pageNum, pageSizeNum);
  }

  @NeedLogin()
  @Post()
  async create(@Body() body: CreateSupplierDto) {
    return this.supplierService.create(body);
  }

  @NeedLogin()
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, body);
  }

  @NeedLogin()
  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.supplierService.delete(id);
    return { success: true };
  }
}