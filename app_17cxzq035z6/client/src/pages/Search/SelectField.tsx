import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectFieldProps> = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLabel = options.find((o) => o.value === value)?.label || options[0]?.label || '';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b', color: '#94a3b8' }}
      >
        {currentLabel}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-30 min-w-full"
          style={{
            backgroundColor: '#121738',
            border: '1px solid #1e293b',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors"
              style={{
                color: value === opt.value ? '#00d4ff' : '#94a3b8',
                backgroundColor: value === opt.value ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1a2050'; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === opt.value ? 'rgba(0,212,255,0.1)' : 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectField;
