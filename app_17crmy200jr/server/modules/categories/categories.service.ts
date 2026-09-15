import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { FeishuBitableService } from "../feishu-bitable/feishu-bitable.service";
import type {
  CategoryItem,
  CategoryL1Item,
  CategoryOption,
  PagedResponse,
} from "@shared/api.interface";

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private readonly domain = "categories";

  constructor(private readonly bitable: FeishuBitableService) {}

  async getL1List(): Promise<CategoryL1Item[]> {
    const allRecords = await this.bitable.getAllRecords(this.domain);

    const groupMap = new Map<string, number>();
    for (const rec of allRecords) {
      const l1 = (rec.category_l1 as string) ?? "";
      const l2 = (rec.category_l2 as string) ?? "";
      if (l1 && l2) {
        groupMap.set(l1, (groupMap.get(l1) ?? 0) + 1);
      }
    }

    const result: CategoryL1Item[] = [];
    for (const [l1, count] of groupMap.entries()) {
      result.push({ id: l1, categoryL1: l1, childCount: count });
    }
    result.sort((a: CategoryL1Item, b: CategoryL1Item) =>
      a.categoryL1.localeCompare(b.categoryL1),
    );

    return result;
  }

  async getL2List(params: {
    categoryL1?: string;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<PagedResponse<CategoryItem>> {
    const { categoryL1, keyword, page, pageSize } = params;

    const allRecords = await this.bitable.getAllRecords(this.domain);

    const filtered: Array<Record<string, unknown>> = allRecords.filter(
      (rec: Record<string, unknown>) => {
        const l2 = (rec.category_l2 as string) ?? "";
        if (!l2) return false;
        if (categoryL1 && rec.category_l1 !== categoryL1) return false;
        if (keyword && !l2.includes(keyword)) return false;
        return true;
      },
    );

    filtered.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const sa = Number(a.sort_order ?? 0);
        const sb = Number(b.sort_order ?? 0);
        if (sa !== sb) return sa - sb;
        return ((a.category_l2 as string) ?? "").localeCompare(
          (b.category_l2 as string) ?? "",
        );
      },
    );

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    return {
      items: pageItems.map((rec: Record<string, unknown>) => ({
        id: (rec.recordId as string) ?? (rec.id as string) ?? "",
        categoryL1: (rec.category_l1 as string) ?? "",
        categoryL2: (rec.category_l2 as string) ?? "",
        sortOrder: Number(rec.sort_order ?? 0),
      })),
      total,
    };
  }

  async getOptions(): Promise<{ items: CategoryOption[] }> {
    const allRecords = await this.bitable.getAllRecords(this.domain);

    const groupMap = new Map<string, CategoryOption>();
    for (const rec of allRecords) {
      const l1 = (rec.category_l1 as string) ?? "";
      const l2 = (rec.category_l2 as string) ?? "";
      if (!l2) continue;

      if (!groupMap.has(l1)) {
        groupMap.set(l1, { categoryL1: l1, children: [] });
      }
      groupMap.get(l1)!.children.push({ categoryL2: l2 });
    }

    return { items: Array.from(groupMap.values()) };
  }

  async createL1(categoryL1: string): Promise<{ id: string }> {
    if (!categoryL1 || !categoryL1.trim()) {
      throw new BadRequestException("一级类目名称不能为空");
    }

    const existing = await this.bitable.getAllRecords(this.domain, {
      conjunction: 'and',
      conditions: [{ fieldName: 'category_l1', operator: 'is', value: [categoryL1] }],
    });

    if (existing.length > 0) {
      throw new ConflictException("一级类目名称已存在");
    }

    const result = await this.bitable.createRecord(this.domain, {
      category_l1: categoryL1,
      category_l2: "",
    });

    return { id: result.id };
  }

  async createL2(params: {
    categoryL1: string;
    categoryL2: string;
    sortOrder: number;
  }): Promise<{ id: string }> {
    const { categoryL1, categoryL2, sortOrder } = params;

    if (!categoryL1 || !categoryL1.trim()) {
      throw new BadRequestException("一级类目不能为空");
    }
    if (!categoryL2 || !categoryL2.trim()) {
      throw new BadRequestException("二级类目名称不能为空");
    }

    const l1Records = await this.bitable.getAllRecords(this.domain, {
      conjunction: 'and',
      conditions: [{ fieldName: 'category_l1', operator: 'is', value: [categoryL1] }],
    });

    if (l1Records.length === 0) {
      throw new BadRequestException("所属一级类目不存在");
    }

    const duplicate = l1Records.some(
      (rec: Record<string, unknown>) =>
        rec.category_l1 === categoryL1 && rec.category_l2 === categoryL2,
    );

    if (duplicate) {
      throw new ConflictException("该一级类目下已存在相同名称的二级类目");
    }

    const result = await this.bitable.createRecord(this.domain, {
      category_l1: categoryL1,
      category_l2: categoryL2,
      sort_order: sortOrder,
    });

    return { id: result.id };
  }

  async update(
    id: string,
    params: { categoryL1?: string; categoryL2?: string; sortOrder?: number },
  ): Promise<{ success: boolean }> {
    const current = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );
    if (!current) {
      throw new NotFoundException("类目不存在");
    }

    const patch: Record<string, unknown> = {};
    if (params.categoryL1 !== undefined) patch.category_l1 = params.categoryL1;
    if (params.categoryL2 !== undefined) patch.category_l2 = params.categoryL2;
    if (params.sortOrder !== undefined) patch.sort_order = params.sortOrder;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    const newL1 = patch.category_l1 ?? current.category_l1;
    const newL2 = patch.category_l2 ?? current.category_l2;

    if (newL2) {
      const sameName = await this.bitable.getAllRecords(this.domain, {
        conjunction: 'and',
        conditions: [
          { fieldName: 'category_l1', operator: 'is', value: [newL1 as string] },
          { fieldName: 'category_l2', operator: 'is', value: [newL2 as string] },
        ],
      });
      const conflict = sameName.some(
        (rec: Record<string, unknown>) => rec.recordId !== id,
      );

      if (conflict) {
        throw new ConflictException("类目名称已存在");
      }
    }

    await this.bitable.updateRecord(this.domain, id, patch);
    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const current = await this.bitable.getRecord<Record<string, unknown>>(
      this.domain,
      id,
    );
    if (!current) {
      throw new NotFoundException("类目不存在");
    }

    const l2 = (current.category_l2 as string) ?? "";
    const l1 = (current.category_l1 as string) ?? "";

    if (!l2) {
      const children = await this.bitable.getAllRecords(this.domain, {
        conjunction: 'and',
        conditions: [
          { fieldName: 'category_l1', operator: 'is', value: [l1] },
          { fieldName: 'category_l2', operator: 'isNotEmpty', value: [] },
        ],
      });

      if (children.length > 0) {
        throw new ConflictException("该一级类目下存在二级类目，无法删除");
      }
    }

    await this.bitable.deleteRecord(this.domain, id);
    this.logger.log(`类目已删除: ${id}`);
    return { success: true };
  }
}
