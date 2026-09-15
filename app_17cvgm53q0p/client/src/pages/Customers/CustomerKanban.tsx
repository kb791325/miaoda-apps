import type { FC } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SALES_STAGES } from '@shared/customer';
import type { Customer } from '@shared/customer';
import { UserDisplay } from '@/components/business-ui/user-display';
import { cn } from '@/lib/utils';
import CustomerLevelBadge from './CustomerLevelBadge';
import { formatAmount, formatDate } from './customer-utils';

const KANBAN_STAGE_ORDER: readonly string[] = [
  '已流失',
  ...SALES_STAGES.filter((stage: string): boolean => stage !== '已流失'),
];

interface CustomerKanbanProps {
  items: Customer[];
  onStageChange: (customer: Customer, stage: string) => void;
}

interface KanbanCardProps {
  customer: Customer;
}

const KanbanCard: FC<KanbanCardProps> = ({ customer }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: customer.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        isDragging && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {customer.customerName}
        </span>
        {customer.crm.grade && (
          <CustomerLevelBadge level={customer.crm.grade} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{customer.phone || '-'}</span>
        <span className="font-semibold tabular-nums text-primary">
          {formatAmount(customer.totalAmount)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {customer.crm.ownerId ? (
          <UserDisplay value={[customer.crm.ownerId]} size="small" />
        ) : (
          <span className="text-xs text-muted-foreground">未分配销售</span>
        )}
        {customer.crm.nextFollowUpAt && (
          <span className="text-xs tabular-nums text-muted-foreground">
            跟进 {formatDate(customer.crm.nextFollowUpAt)}
          </span>
        )}
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  stage: string;
  customers: Customer[];
}

const KanbanColumn: FC<KanbanColumnProps> = ({ stage, customers }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-lg bg-muted/40 transition-colors',
        isOver && 'bg-accent',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">{stage}</span>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {customers.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
      >
        {customers.map((customer: Customer) => (
          <KanbanCard key={customer.id} customer={customer} />
        ))}
        {customers.length === 0 && (
          <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            拖拽客户卡片到此阶段
          </div>
        )}
      </div>
    </div>
  );
};

const CustomerKanban: FC<CustomerKanbanProps> = ({ items, onStageChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over) return;
    const customer: Customer | undefined = items.find(
      (item: Customer): boolean => item.id === active.id,
    );
    const stage: string = String(over.id);
    if (!customer || customer.crm.salesStage === stage) return;
    onStageChange(customer, stage);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {KANBAN_STAGE_ORDER.map((stage: string) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            customers={items.filter(
              (item: Customer): boolean => item.crm.salesStage === stage,
            )}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default CustomerKanban;
