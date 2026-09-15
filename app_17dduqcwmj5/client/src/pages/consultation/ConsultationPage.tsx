import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ROLE_SUBJECT, useAuth } from '@lark-apaas/client-toolkit/auth';
import { APP_ROLES } from '@shared/roles';
import { Card, CardContent } from '@client/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import type {
  ConvertFaqMissRequest,
  CreateFaqRequest,
  FaqListItem,
  FaqMissListItem,
  UpdateFaqRequest,
} from '@shared/consultation';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import ConsultationChatPanel from './ConsultationChatPanel';
import FaqMissPanel from './FaqMissPanel';
import KnowledgeBasePanel, { type FaqFilters } from './KnowledgeBasePanel';
import {
  convertFaqMiss,
  createFaq,
  listFaqMisses,
  listFaqs,
  updateFaq,
} from './consultation.api';

const FAQ_PAGE_SIZE = 20;
const MISS_PAGE_SIZE = 20;

const STAFF_ROLES: string[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
];

const ConsultationPage = () => {
  const { ability, isLoading: authLoading } = useAuth();
  const isStaff: boolean =
    !authLoading &&
    STAFF_ROLES.some((role: string) => ability.can(role, ROLE_SUBJECT));
  const [faqItems, setFaqItems] = useState<FaqListItem[]>([]);
  const [faqTotal, setFaqTotal] = useState<number>(0);
  const [faqLoading, setFaqLoading] = useState<boolean>(false);
  const [faqFilters, setFaqFilters] = useState<FaqFilters>({
    category: '',
    status: '',
    keyword: '',
  });
  const [faqPage, setFaqPage] = useState<number>(1);

  const [missItems, setMissItems] = useState<FaqMissListItem[]>([]);
  const [missTotal, setMissTotal] = useState<number>(0);
  const [missLoading, setMissLoading] = useState<boolean>(false);
  const [missStatus, setMissStatus] = useState<string>('');
  const [missPage, setMissPage] = useState<number>(1);

  const loadFaqs = useCallback(async (): Promise<void> => {
    setFaqLoading(true);
    try {
      const data = await listFaqs({
        category: faqFilters.category,
        status: faqFilters.status,
        keyword: faqFilters.keyword,
        page: faqPage,
        pageSize: FAQ_PAGE_SIZE,
      });
      setFaqItems(data.items);
      setFaqTotal(data.total);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '加载常见问题失败';
      toast.error(message);
      setFaqItems([]);
      setFaqTotal(0);
    } finally {
      setFaqLoading(false);
    }
  }, [faqFilters, faqPage]);

  const loadMisses = useCallback(async (): Promise<void> => {
    setMissLoading(true);
    try {
      const data = await listFaqMisses({
        status: missStatus,
        page: missPage,
        pageSize: MISS_PAGE_SIZE,
      });
      setMissItems(data.items);
      setMissTotal(data.total);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '加载待补充问题失败';
      toast.error(message);
      setMissItems([]);
      setMissTotal(0);
    } finally {
      setMissLoading(false);
    }
  }, [missStatus, missPage]);

  useEffect(() => {
    if (!isStaff) return;
    void loadFaqs();
  }, [isStaff, loadFaqs]);

  useEffect(() => {
    if (!isStaff) return;
    void loadMisses();
  }, [isStaff, loadMisses]);

  const {
    syncingIds: faqSyncingIds,
    retry: retryFaqSync,
  } = useBitableRetry('faq', loadFaqs);
  const {
    syncingIds: missSyncingIds,
    retry: retryMissSync,
  } = useBitableRetry('faqMiss', loadMisses);

  const handleFiltersChange = (filters: FaqFilters) => {
    setFaqFilters(filters);
    setFaqPage(1);
  };

  const handleMissStatusChange = (status: string) => {
    setMissStatus(status);
    setMissPage(1);
  };

  const handleCreateFaq = async (request: CreateFaqRequest): Promise<void> => {
    await createFaq(request);
    toast.success('新增常见问题成功');
    void loadFaqs();
  };

  const handleUpdateFaq = async (
    id: string,
    request: UpdateFaqRequest,
  ): Promise<void> => {
    await updateFaq(id, request);
    toast.success('常见问题已更新');
    void loadFaqs();
  };

  const handleConvertMiss = async (
    id: string,
    request: ConvertFaqMissRequest,
  ): Promise<void> => {
    await convertFaqMiss(id, request);
    toast.success('已转换为常见问题');
    void loadFaqs();
    void loadMisses();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">智能咨询</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          FAQ 智能问答、知识库维护与未命中问题补充
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={isStaff ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <ConsultationChatPanel />
        </div>
        {isStaff ? (
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="knowledge">
                <TabsList>
                  <TabsTrigger value="knowledge">知识库</TabsTrigger>
                  <TabsTrigger value="misses">待补充</TabsTrigger>
                </TabsList>
                <TabsContent value="knowledge" className="mt-4">
                  <KnowledgeBasePanel
                    items={faqItems}
                    total={faqTotal}
                    loading={faqLoading}
                    filters={faqFilters}
                    page={faqPage}
                    pageSize={FAQ_PAGE_SIZE}
                    onFiltersChange={handleFiltersChange}
                    onPageChange={setFaqPage}
                    onCreate={handleCreateFaq}
                    onUpdate={handleUpdateFaq}
                    syncingIds={faqSyncingIds}
                    onRetrySync={retryFaqSync}
                  />
                </TabsContent>
                <TabsContent value="misses" className="mt-4">
                  <FaqMissPanel
                    items={missItems}
                    total={missTotal}
                    loading={missLoading}
                    statusFilter={missStatus}
                    page={missPage}
                    pageSize={MISS_PAGE_SIZE}
                    onStatusChange={handleMissStatusChange}
                    onPageChange={setMissPage}
                    onConvert={handleConvertMiss}
                    syncingIds={missSyncingIds}
                    onRetrySync={retryMissSync}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        ) : null}
      </div>
    </div>
  );
};

export default ConsultationPage;
