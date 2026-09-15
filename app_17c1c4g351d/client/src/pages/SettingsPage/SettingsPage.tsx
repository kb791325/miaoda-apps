import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Database, Upload, FileSpreadsheet, Package, Users, TrendingUp, Headphones, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataImportDialog from '@/components/DataImportDialog';
import type { ImportEntityType } from '@/api/data-import';
import RoleManager from './RoleManager';
import BitableSyncSection from './BitableSyncSection';
import ApiImportSection from './ApiImportSection';

const IMPORT_ENTITIES: {
  entity: ImportEntityType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { entity: 'products', label: '商品数据', description: '导入商品信息、价格、销量等', icon: Package },
  { entity: 'inventory', label: '库存数据', description: '导入库存量、安全库存、补货建议等', icon: Warehouse },
  { entity: 'customers', label: '客户数据', description: '导入客户信息、消费记录、RFM 分层等', icon: Users },
  { entity: 'after-sale', label: '售后工单', description: '导入售后订单、退款原因、处理状态等', icon: Headphones },
  { entity: 'channels', label: '投放渠道', description: '导入渠道花费、点击量、ROI 等', icon: TrendingUp },
  { entity: 'keywords', label: '流量关键词', description: '导入搜索关键词、转化率、GMV 等', icon: FileSpreadsheet },
];

export default function SettingsPage() {
  const [importEntity, setImportEntity] = useState<ImportEntityType | null>(null);
  const [importLabel, setImportLabel] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const handleOpenImport = (entity: ImportEntityType, label: string) => {
    setImportEntity(entity);
    setImportLabel(label);
    setImportOpen(true);
  };

  return (
    <div className="px-6 py-6 max-w-[1360px] mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-1">系统设置</h1>
      <p className="text-sm text-muted-foreground mb-6">管理账号权限和数据导入</p>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="permissions" className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            权限管理
          </TabsTrigger>
          <TabsTrigger value="data-import" className="gap-1.5">
            <Database className="size-3.5" />
            数据导入
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions">
          <RoleManager />
        </TabsContent>

        <TabsContent value="data-import">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Excel 文件导入</CardTitle>
                <CardDescription>
                  支持 .xlsx / .xls / .csv 格式批量导入业务数据，文件列名可使用中文或英文
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {IMPORT_ENTITIES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.entity}
                        className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 transition-colors"
                      >
                        <div className="size-9 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                          <Icon className="size-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2.5 text-xs"
                            onClick={() => handleOpenImport(item.entity, item.label)}
                          >
                            <Upload className="size-3 mr-1" />
                            选择文件导入
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <BitableSyncSection />

            <ApiImportSection />
          </div>

          {importEntity && (
            <DataImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              entity={importEntity}
              entityLabel={importLabel}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
