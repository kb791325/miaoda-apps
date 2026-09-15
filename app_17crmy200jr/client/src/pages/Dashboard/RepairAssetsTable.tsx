import { Badge } from '@client/src/components/ui/badge';
import type { FC } from 'react';
import { Wrench, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardRepairAssetItem } from '@shared/api.interface';

interface RepairAssetsTableProps {
  data: DashboardRepairAssetItem[];
}

function fmtDate(d: string): string {
  return d ? d.split('T')[0] : '-';
}

export const RepairAssetsTable: FC<RepairAssetsTableProps> = ({ data }) => {
  const navigate = useNavigate();
  const displayData = data.slice(0, 10);

  const handleRowClick = (id: string) => {
    navigate(`/fixed-assets/${id}`);
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Wrench size={18} className="text-amber-500" />
        <span className="text-base font-semibold text-foreground">
          维修资产
        </span>
        <Badge variant="outline" className="ml-1 text-amber-600 border-amber-200 bg-amber-50">
          {data.length} 件
        </Badge>
      </div>

      {displayData.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          暂无维修资产
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 h-12 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  资产名称
                </th>
                <th className="text-left px-4 h-12 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  类型
                </th>
                <th className="text-left px-4 h-12 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  维修原因
                </th>
                <th className="text-left px-4 h-12 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  发起日期
                </th>
                <th className="px-4 h-12 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item: DashboardRepairAssetItem) => (
                <tr
                  key={item.id}
                  className="cursor-pointer transition-colors hover:bg-accent border-b border-border last:border-b-0 h-12"
                  onClick={() => handleRowClick(item.id)}
                >
                  <td className="px-4 font-medium text-foreground">
                    {item.assetName}
                  </td>
                  <td className="px-4 text-muted-foreground">
                    {item.assetType}
                  </td>
                  <td className="px-4 text-foreground">
                    {item.repairReason || '-'}
                  </td>
                  <td className="px-4 font-mono text-foreground">
                    {fmtDate(item.repairDate)}
                  </td>
                  <td className="px-4 text-right">
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
