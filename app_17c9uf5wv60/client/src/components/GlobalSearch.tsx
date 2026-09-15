import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@client/src/components/ui/input';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { searchAll } from '@client/src/api/global-search';
import type {
  GlobalSearchResponse,
  GlobalSearchProductHit,
  GlobalSearchOrderHit,
  GlobalSearchSupplierHit,
} from '@shared/api.interface';

const MIN_KEYWORD_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_HITS_PER_GROUP = 5;

interface SearchGroupProps {
  title: string;
  children: React.ReactNode;
}

const SearchGroup: React.FC<SearchGroupProps> = ({ title, children }) => (
  <div className="py-1">
    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {title}
    </div>
    {children}
  </div>
);

const ROW_CLASS =
  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-accent';

const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState<string>('');
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    const trimmed: string = keyword.trim();
    if (trimmed.length < MIN_KEYWORD_LENGTH) {
      setResults(null);
      setLoading(false);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      requestIdRef.current += 1;
      const requestId: number = requestIdRef.current;
      searchAll(trimmed)
        .then((res: GlobalSearchResponse) => {
          if (requestIdRef.current !== requestId) return;
          setResults(res);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== requestId) return;
          logger.error(
            '[global-search] searchAll error',
            err instanceof Error ? err.message : String(err),
          );
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword]);

  const goTo = (path: string, value: string): void => {
    setOpen(false);
    setKeyword('');
    setResults(null);
    navigate(`${path}?keyword=${encodeURIComponent(value)}`);
  };

  const handleProductClick = (hit: GlobalSearchProductHit): void => {
    goTo('/products', hit.name);
  };

  const handleOrderClick = (hit: GlobalSearchOrderHit): void => {
    goTo('/sales-orders', hit.orderNo);
  };

  const handleSupplierClick = (hit: GlobalSearchSupplierHit): void => {
    goTo('/suppliers', hit.name);
  };

  const productHits: GlobalSearchProductHit[] = results
    ? results.products.slice(0, MAX_HITS_PER_GROUP)
    : [];
  const orderHits: GlobalSearchOrderHit[] = results
    ? results.salesOrders.slice(0, MAX_HITS_PER_GROUP)
    : [];
  const supplierHits: GlobalSearchSupplierHit[] = results
    ? results.suppliers.slice(0, MAX_HITS_PER_GROUP)
    : [];
  const hasHits: boolean =
    productHits.length + orderHits.length + supplierHits.length > 0;
  const showPanel: boolean =
    open && keyword.trim().length >= MIN_KEYWORD_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="global-search-input"
          value={keyword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setKeyword(e.target.value)
          }
          onFocus={() => {
            if (results && keyword.trim().length >= MIN_KEYWORD_LENGTH) {
              setOpen(true);
            }
          }}
          placeholder="搜索商品 / 订单 / 供应商"
          className="pl-8 rounded-sm shadow-none"
        />
      </div>
      {showPanel && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              搜索中...
            </div>
          ) : !hasHits ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              无匹配结果
            </div>
          ) : (
            <div className="divide-y divide-border">
              {productHits.length > 0 && (
                <SearchGroup title="商品">
                  {productHits.map((hit: GlobalSearchProductHit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => handleProductClick(hit)}
                      className={ROW_CLASS}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {hit.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {hit.category}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {hit.code}
                      </span>
                    </button>
                  ))}
                </SearchGroup>
              )}
              {orderHits.length > 0 && (
                <SearchGroup title="销售订单">
                  {orderHits.map((hit: GlobalSearchOrderHit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => handleOrderClick(hit)}
                      className={ROW_CLASS}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
                        {hit.orderNo}
                      </span>
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {hit.customerName}
                      </span>
                    </button>
                  ))}
                </SearchGroup>
              )}
              {supplierHits.length > 0 && (
                <SearchGroup title="供应商">
                  {supplierHits.map((hit: GlobalSearchSupplierHit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => handleSupplierClick(hit)}
                      className={ROW_CLASS}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {hit.name}
                      </span>
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {hit.contactPerson}
                      </span>
                    </button>
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
