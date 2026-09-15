import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { cn } from "@client/src/lib/utils";

import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { Textarea } from "@client/src/components/ui/textarea";
import { Calendar } from "@client/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/src/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@client/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";

import * as suppliersApi from "@client/src/api/suppliers";
import * as licensesApi from "@client/src/api/licenses";
import type {
  LicenseItem,
  CreateLicenseDto,
  UpdateLicenseDto,
  LicenseSoftwareType,
  LicenseMode,
} from "@shared/api.interface";
import type { SupplierItem } from "@shared/api.interface";

// ============================================================
// Constants
// ============================================================

const SOFTWARE_TYPE_OPTIONS: {
  value: LicenseSoftwareType;
  label: string;
}[] = [
  { value: "os", label: "操作系统" },
  { value: "office", label: "办公软件" },
  { value: "design", label: "设计软件" },
  { value: "dev_tool", label: "开发工具" },
  { value: "security", label: "安全软件" },
  { value: "other", label: "其他" },
];

const LICENSE_MODE_OPTIONS: {
  value: LicenseMode;
  label: string;
}[] = [
  { value: "per_device", label: "按设备" },
  { value: "per_user", label: "按用户" },
  { value: "per_server", label: "按服务器" },
  { value: "subscription", label: "订阅制" },
];

// ============================================================
// Form schema
// ============================================================

const licenseSchema = z.object({
  name: z
    .string()
    .min(1, "许可证名称不能为空")
    .max(300, "名称不能超过300字"),
  softwareType: z.enum([
    "os",
    "office",
    "design",
    "dev_tool",
    "security",
    "other",
  ]),
  licenseKey: z.string().optional().default(""),
  licenseMode: z.enum([
    "per_device",
    "per_user",
    "per_server",
    "subscription",
  ]),
  totalSeats: z.coerce.number().int().min(1, "座位数至少为1"),
  purchaseDate: z.string().optional().default(""),
  purchaseAmount: z.coerce.number().min(0).optional().default(0),
  expireDate: z.string().min(1, "到期日期不能为空"),
  supplierId: z.string().optional().default(""),
  remark: z.string().optional().default(""),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

// ============================================================
// Component
// ============================================================

interface CreateLicenseDialogProps {
  open: boolean;
  mode: "create" | "edit";
  license?: LicenseItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLicenseDialog: React.FC<CreateLicenseDialogProps> = ({
  open,
  mode,
  license,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [suppliersLoading, setSuppliersLoading] =
    useState<boolean>(false);

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      name: "",
      softwareType: "os",
      licenseKey: "",
      licenseMode: "per_device",
      totalSeats: 1,
      purchaseDate: "",
      purchaseAmount: 0,
      expireDate: "",
      supplierId: "",
      remark: "",
    },
  });

  // ---- Load suppliers ----

  const loadSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const res = await suppliersApi.list({ pageSize: 100 });
      setSuppliers(res.items);
    } catch (err: unknown) {
      logger.error("获取供应商列表失败:", err);
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadSuppliers();
  }, [open, loadSuppliers]);

  // ---- Reset form on open / mode change ----

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && license) {
      form.reset({
        name: license.name,
        softwareType: license.softwareType,
        licenseKey: "",
        licenseMode: license.licenseMode,
        totalSeats: license.totalSeats,
        purchaseDate: license.purchaseDate || "",
        purchaseAmount: license.purchaseAmount || 0,
        expireDate: license.expireDate || "",
        supplierId: "",
        remark: license.remark || "",
      });
    } else {
      form.reset({
        name: "",
        softwareType: "os",
        licenseKey: "",
        licenseMode: "per_device",
        totalSeats: 1,
        purchaseDate: "",
        purchaseAmount: 0,
        expireDate: "",
        supplierId: "",
        remark: "",
      });
    }
  }, [open, mode, license, form]);

  // ---- Submit ----

  const handleSubmit = async (data: LicenseFormData) => {
    setSubmitting(true);
    try {
      const dto: CreateLicenseDto = {
        name: data.name,
        softwareType: data.softwareType as LicenseSoftwareType,
        licenseKey: data.licenseKey || undefined,
        licenseMode: data.licenseMode as LicenseMode,
        totalSeats: data.totalSeats,
        purchaseDate: data.purchaseDate || undefined,
        purchaseAmount: data.purchaseAmount || undefined,
        expireDate: data.expireDate,
        supplierId:
          data.supplierId && data.supplierId !== "none"
            ? data.supplierId
            : undefined,
        remark: data.remark || undefined,
      };

      if (mode === "edit" && license) {
        const patch: UpdateLicenseDto = { ...dto };
        await licensesApi.update(license.id, patch);
        toast.success("许可证已更新");
      } else {
        await licensesApi.create(dto);
        toast.success("许可证已创建");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      logger.error("提交许可证失败:", err);
      toast.error("操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render ----

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新增许可证" : "编辑许可证"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "填写许可证信息，带 * 为必填"
              : "修改许可证信息"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    许可证名称{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入许可证名称"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Software Type + License Mode */}
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="softwareType"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      软件类型{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择软件类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOFTWARE_TYPE_OPTIONS.map(
                          (opt: {
                            value: LicenseSoftwareType;
                            label: string;
                          }) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                            >
                              {opt.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseMode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      授权方式{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择授权方式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LICENSE_MODE_OPTIONS.map(
                          (opt: {
                            value: LicenseMode;
                            label: string;
                          }) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                            >
                              {opt.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* License Key */}
            <FormField
              control={form.control}
              name="licenseKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>许可证密钥</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="许可证密钥（可选）"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total Seats + Purchase Amount */}
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="totalSeats"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      总座位数{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="座位数"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? Number(e.target.value)
                              : "",
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseAmount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>采购金额</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="金额（可选）"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? Number(e.target.value)
                              : 0,
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purchase Date + Expire Date */}
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>采购日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value &&
                                "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? dayjs(field.value).format(
                                  "YYYY-MM-DD",
                                )
                              : "选择日期"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={
                            field.value
                              ? new Date(field.value)
                              : undefined
                          }
                          onSelect={(date: Date | undefined) =>
                            field.onChange(
                              date
                                ? dayjs(date).format(
                                    "YYYY-MM-DD",
                                  )
                                : "",
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expireDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      到期日期{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value &&
                                "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? dayjs(field.value).format(
                                  "YYYY-MM-DD",
                                )
                              : "选择日期"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={
                            field.value
                              ? new Date(field.value)
                              : undefined
                          }
                          onSelect={(date: Date | undefined) =>
                            field.onChange(
                              date
                                ? dayjs(date).format(
                                    "YYYY-MM-DD",
                                  )
                                : "",
                            )
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>供应商</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={suppliersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            suppliersLoading
                              ? "加载中..."
                              : "选择供应商（可选）"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        不选择供应商
                      </SelectItem>
                      {suppliers.map(
                        (s: SupplierItem) => (
                          <SelectItem
                            key={s.id}
                            value={s.id}
                          >
                            {s.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remark */}
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="备注信息（可选）"
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : mode === "create" ? (
                  "创建"
                ) : (
                  "保存"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLicenseDialog;