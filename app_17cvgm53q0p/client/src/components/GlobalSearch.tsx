import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchProducts } from '@/api/product';
import { fetchCustomers } from '@/api/customer';
import type { Product } from '@shared/product';
import type { Customer } from '@shared/customer';

const MAX_RESULTS = 5;

interface GlobalSearchProps {
  className?: string;
}

/** 顶部全局搜索：按关键字同时检索商品与客户，点击结果跳转对应页面并带出筛选 */
const GlobalSearch: React.FC<GlobalSearchProps> = ({ className }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setProducts([]);
      setCustomers([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(() => {
      void Promise.all([
        fetchProducts({ keyword: trimmed }),
        fetchCustomers({ keyword: trimmed }),
      ])
        .then(([productRes, customerRes]) => {
          setProducts(productRes.items.slice(0, MAX_RESULTS));
          setCustomers(customerRes.items.slice(0, MAX_RESULTS));
          setOpen(true);
        })
        .catch(() => {
          setProducts([]);
          setCustomers([]);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = products.length > 0 || customers.length > 0;

  const go = (path: string): void => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={keyword}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setKeyword(e.target.value)
        }
        onFocus={() => {
          if (keyword.trim() && hasResults) setOpen(true);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && keyword.trim()) {
            go(`/inventory?keyword=${encodeURIComponent(keyword.trim())}`);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="搜索商品 / 客户，回车跳转"
        className="w-72 bg-muted/40 pl-9"
      />
      {open && keyword.trim() ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-80 rounded-lg border bg-popover p-2 shadow-lg">
          {hasResults ? (
            <>
              {products.length > 0 ? (
                <div>
                  <p className="px-2 py-1 text-xs text-muted-foreground">商品</p>
                  {products.map((product: Product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        go(
                          `/inventory?keyword=${encodeURIComponent(product.productName)}`,
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Package className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{product.productName}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        库存 {product.stock}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {customers.length > 0 ? (
                <div className={products.length > 0 ? 'mt-1' : ''}>
                  <p className="px-2 py-1 text-xs text-muted-foreground">客户</p>
                  {customers.map((customer: Customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() =>
                        go(
                          `/customers?keyword=${encodeURIComponent(customer.customerName)}`,
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <UserRound className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{customer.customerName}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {customer.orderCount} 笔订单
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">
              未找到相关商品或客户
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GlobalSearch;
