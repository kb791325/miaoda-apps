import React from 'react';

import type { ShipmentStatus } from '@shared/shipment';

import { STATUS_TAG_CLASS } from '@client/src/utils/status-tag-styles';

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus | '已取消';
  /** 详情页大标签 */
  large?: boolean;
}

const ShipmentStatusBadge: React.FC<ShipmentStatusBadgeProps> = ({
  status,
  large = false,
}) => {
  const style: string =
    STATUS_TAG_CLASS[status] ?? STATUS_TAG_CLASS['已完成'] ?? '';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${style} ${
        large ? 'px-3.5 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {status}
    </span>
  );
};

export default ShipmentStatusBadge;
