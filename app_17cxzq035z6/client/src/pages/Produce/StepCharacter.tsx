import React, { useState } from 'react';
import {
  User,
  Upload,
  RefreshCw,
  Check,
  Plus,
  X,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';

interface AnchorItem {
  id: number;
  label: string;
  value: string;
}

interface StepCharacterProps {
  onComplete?: () => void;
}

const StepCharacter: React.FC<StepCharacterProps> = ({ onComplete }) => {
  const [description, setDescription] = useState<string>(
    '年轻女性，25岁左右，长发微卷，五官精致，气质清新自然，身穿简约白色上衣，背景为柔和的室内环境',
  );
  const [anchors, setAnchors] = useState<AnchorItem[]>([
    { id: 1, label: '发型', value: '长发微卷，深棕色' },
    { id: 2, label: '脸型', value: '鹅蛋脸，五官精致' },
    { id: 3, label: '服装', value: '简约白色上衣' },
    { id: 4, label: '配饰', value: '细小银色项链' },
  ]);
  const [newAnchorLabel, setNewAnchorLabel] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [candidateImages, setCandidateImages] = useState<string[]>([
    'https://picsum.photos/seed/char1/300/400',
    'https://picsum.photos/seed/char2/300/400',
    'https://picsum.photos/seed/char3/300/400',
    'https://picsum.photos/seed/char4/300/400',
  ]);

  const handleAddAnchor = (): void => {
    if (!newAnchorLabel.trim()) return;
    const newId = Math.max(...anchors.map((a) => a.id), 0) + 1;
    setAnchors([...anchors, { id: newId, label: newAnchorLabel.trim(), value: '' }]);
    setNewAnchorLabel('');
  };

  const handleRemoveAnchor = (id: number): void => {
    setAnchors(anchors.filter((a) => a.id !== id));
  };

  const handleUpdateAnchor = (id: number, value: string): void => {
    setAnchors(anchors.map((a) => (a.id === id ? { ...a, value } : a)));
  };

  const handleGenerate = (): void => {
    setGenerating(true);
    setSelectedIndex(null);
    setTimeout(() => {
      setCandidateImages([
        'https://picsum.photos/seed/char5/300/400',
        'https://picsum.photos/seed/char6/300/400',
        'https://picsum.photos/seed/char7/300/400',
        'https://picsum.photos/seed/char8/300/400',
      ]);
      setGenerating(false);
    }, 1500);
  };

  const handleRegenerate = (index: number): void => {
    const newImages = [...candidateImages];
    newImages[index] = `https://picsum.photos/seed/char${Date.now()}/300/400`;
    setCandidateImages(newImages);
  };

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
          >
            <User size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              角色设定
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              定义视频中的主角形象，保持全片一致性
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-md flex items-center gap-1"
          style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <Wand2 size={12} />
          需对接AI绘图API
        </span>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
          角色描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none leading-relaxed"
          rows={4}
          style={{
            backgroundColor: 'rgba(10,14,39,0.5)',
            border: '1px solid #1e293b',
            color: '#e2e8f0',
          }}
          placeholder="详细描述角色的外貌、年龄、气质、穿着等..."
        />
      </div>

      {/* Consistency Anchors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            角色一致性锚点
          </label>
          <div className="flex items-center gap-1">
            <input
              value={newAnchorLabel}
              onChange={(e) => setNewAnchorLabel(e.target.value)}
              placeholder="添加锚点"
              className="w-24 px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: 'rgba(10,14,39,0.5)',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAnchor()}
            />
            <button
              onClick={handleAddAnchor}
              className="p-1 rounded hover:opacity-80"
              style={{ color: '#6366f1' }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {anchors.map((anchor) => (
            <div
              key={anchor.id}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(10,14,39,0.5)',
                border: '1px solid #1e293b',
              }}
            >
              <span
                className="text-xs font-medium flex-shrink-0 w-12"
                style={{ color: '#6366f1' }}
              >
                {anchor.label}
              </span>
              <input
                value={anchor.value}
                onChange={(e) => handleUpdateAnchor(anchor.id, e.target.value)}
                className="flex-1 px-2 py-1 rounded text-xs bg-transparent"
                style={{ color: '#e2e8f0' }}
                placeholder="描述..."
              />
              <button
                onClick={() => handleRemoveAnchor(anchor.id)}
                className="p-0.5 hover:opacity-80"
                style={{ color: '#64748b' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            候选角色参考图
          </label>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#c7d2fe',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {generating ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {generating ? '生成中...' : '生成角色图'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {candidateImages.map((img, index) => (
            <div key={index} className="space-y-2">
              <div
                className="relative rounded-lg overflow-hidden aspect-[3/4]"
                style={{
                  border: `2px solid ${
                    selectedIndex === index ? '#00d4ff' : '#1e293b'
                  }`,
                }}
              >
                <Image
                  src={img}
                  alt={`候选${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedIndex === index && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#00d4ff' }}
                  >
                    <Check size={14} style={{ color: '#0a0e27' }} />
                  </div>
                )}
                {generating && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(10,14,39,0.6)' }}
                  >
                    <RefreshCw size={20} className="animate-spin" style={{ color: '#6366f1' }} />
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedIndex(index)}
                  className="flex-1 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor:
                      selectedIndex === index
                        ? 'rgba(0,212,255,0.15)'
                        : 'rgba(99,102,241,0.1)',
                    color: selectedIndex === index ? '#00d4ff' : '#94a3b8',
                    border: `1px solid ${
                      selectedIndex === index
                        ? 'rgba(0,212,255,0.4)'
                        : 'rgba(99,102,241,0.2)'
                    }`,
                  }}
                >
                  {selectedIndex === index ? '已选择' : '选择'}
                </button>
                <button
                  onClick={() => handleRegenerate(index)}
                  className="p-1 rounded transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(148,163,184,0.1)',
                    color: '#64748b',
                    border: '1px solid #1e293b',
                  }}
                  title="重新生成"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div
        className="p-4 rounded-lg border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all hover:opacity-80"
        style={{
          backgroundColor: 'rgba(10,14,39,0.3)',
          border: '1px dashed #1e293b',
          color: '#64748b',
        }}
      >
        <Upload size={18} />
        <span className="text-sm">上传自定义角色参考图</span>
      </div>

      {/* Next */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onComplete}
          disabled={selectedIndex === null}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#00d4ff',
            color: '#0a0e27',
            boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
          }}
        >
          下一步：分镜图生成
        </button>
      </div>
    </div>
  );
};

export default StepCharacter;
