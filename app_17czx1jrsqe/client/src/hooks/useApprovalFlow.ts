import { useState, useEffect, useCallback } from 'react';
import { approvalsApi, approvalStepsApi } from '@/api';
import type { ApprovalStep, ApprovalSubApprover } from '@/components/ApprovalTimeline';

interface ApprovalInstance {
  id: number;
  business_type: string;
  business_id: number;
  title: string;
  applicant_name: string;
  status: string;
  result: string;
  created_at: string;
}

function normalizeMode(mode: string): 'single' | 'countersign' | 'orsign' {
  if (mode === 'countersign') return 'countersign';
  if (mode === 'or_sign' || mode === 'orsign') return 'orsign';
  return 'single';
}

function normalizeSteps(rawSteps: any[]): ApprovalStep[] {
  return rawSteps.map((s) => {
    const mode = normalizeMode(s.mode || 'single');
    let subApprovers: ApprovalSubApprover[] | undefined;
    if (s.sub_approvers) {
      try {
        const arr = typeof s.sub_approvers === 'string'
          ? JSON.parse(s.sub_approvers)
          : s.sub_approvers;
        subApprovers = Array.isArray(arr) ? arr.map((sub: any) => ({
          name: sub.name || sub.role || '',
          role: sub.role,
          status: sub.status || 'pending',
          comment: sub.comment,
          approved_at: sub.approved_at,
          user_id: sub.user_id,
        })) : undefined;
      } catch {
        subApprovers = undefined;
      }
    }
    return {
      id: s.id,
      step_name: s.step_name,
      approver_name: s.approver_name || '',
      status: s.status || 'pending',
      comment: s.comment,
      approved_at: s.approved_at,
      mode,
      sub_approvers: subApprovers,
      is_submit: s.is_submit || s.step_order === 0,
    } as ApprovalStep & { mode?: 'single' | 'countersign' | 'orsign' };
  });
}

export function useApprovalFlow(
  businessType: string | null,
  businessId: number | null,
) {
  const [instance, setInstance] = useState<ApprovalInstance | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessType || !businessId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approvalsApi.getByBusiness(businessType, businessId);
      if (res.code === 0 && res.data) {
        const inst = res.data as ApprovalInstance;
        setInstance(inst);
        const stepsRes = await approvalsApi.getSteps(inst.id);
        if (stepsRes.code === 0) {
          setSteps(normalizeSteps((stepsRes.data as any[]) || []));
        } else {
          setSteps([]);
        }
      } else {
        setInstance(null);
        setSteps([]);
      }
    } catch (e: any) {
      setError(e?.message || '加载失败');
      setInstance(null);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [businessType, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  // 当前待处理节点（第一个非approved非rejected的）
  const currentStepId = steps.find(
    (s) => s.status === 'pending' || s.status === 'current' || s.status === 'processing',
  )?.id || null;

  const stepApprove = useCallback(
    async (stepId: number, comment?: string) => {
      if (!instance) return { success: false };
      try {
        const res = await approvalStepsApi.stepApprove(instance.id, stepId, comment);
        if (res.code === 0) {
          await load();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (e: any) {
        return { success: false, message: e?.message || '操作失败' };
      }
    },
    [instance, load],
  );

  const stepReject = useCallback(
    async (stepId: number, comment?: string) => {
      if (!instance) return { success: false };
      try {
        const res = await approvalStepsApi.stepReject(instance.id, stepId, comment);
        if (res.code === 0) {
          await load();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (e: any) {
        return { success: false, message: e?.message || '操作失败' };
      }
    },
    [instance, load],
  );

  // 提交审批（如果还没实例）
  const submit = useCallback(
    async (title?: string) => {
      if (!businessType || !businessId) return { success: false };
      try {
        const res = await approvalsApi.submit({ businessType, businessId, title });
        if (res.code === 0) {
          await load();
          return { success: true };
        }
        return { success: false, message: res.message };
      } catch (e: any) {
        return { success: false, message: e?.message || '提交失败' };
      }
    },
    [businessType, businessId, load],
  );

  return {
    instance,
    steps,
    loading,
    error,
    currentStepId,
    stepApprove,
    stepReject,
    submit,
    refresh: load,
  };
}

export default useApprovalFlow;
