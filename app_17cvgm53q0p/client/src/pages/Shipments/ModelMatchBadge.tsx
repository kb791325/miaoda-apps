import React from 'react';

interface ModelMatchBadgeProps {
  /** 型号是否一致 */
  match: boolean;
}

const ModelMatchBadge: React.FC<ModelMatchBadgeProps> = ({ match }) => {
  if (match) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        ✅一致
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
      ❌不一致
    </span>
  );
};

export default ModelMatchBadge;
