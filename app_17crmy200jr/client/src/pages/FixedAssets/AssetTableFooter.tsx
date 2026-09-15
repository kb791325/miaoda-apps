import PaginationFooter from '@client/src/components/ui/pagination-footer';

interface AssetTableFooterProps {
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const AssetTableFooter = (props: AssetTableFooterProps) => (
  <PaginationFooter {...props} />
);

export default AssetTableFooter;