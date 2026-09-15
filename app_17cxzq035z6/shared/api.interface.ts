export interface EightDimScores {
  hook: number;
  retention: number;
  emotion: number;
  editing: number;
  visual: number;
  copywriting: number;
  engagement: number;
  completion: number;
}

export interface EmotionPoint {
  time: number;
  value: number;
}

export interface RetentionNode {
  time: number;
  description: string;
}

export interface AnalyzeDetail {
  hookAnalysis: string;
  emotionCurve: EmotionPoint[];
  retentionNodes: RetentionNode[];
  copyStructure: string;
  replicableElements: string[];
  editingRhythm: string;
  visualStyle: string;
  trafficPool?: {
    currentLevel: string;
    currentPlayRange: string;
    nextLevel: string;
    nextPlayRange: string;
    breakthroughProbability: number;
    advice: string;
  };
}

export interface CommentCluster {
  name: string;
  count: number;
}

export interface CommentAnalysis {
  topComments: string[];
  clusters: CommentCluster[];
}

export interface RemakeSop {
  selectionCriteria: string;
  copyTemplate: string;
  editingParams: string;
  publishStrategy: string;
}

export interface VideoRecord {
  id: string;
  awemeId: string;
  title?: string;
  authorUid?: string;
  authorNickname?: string;
  authorAvatar?: string;
  followerCount: number;
  coverUrl?: string;
  videoUrl?: string;
  duration: number;
  publishTime?: string;
  diggCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
  playCount: number;
  hashtags: string[];
  taskId?: string;
  category?: string;
  overallScore?: number;
  grade?: string;
  eightDimScores?: EightDimScores;
  analyzeDetail?: AnalyzeDetail;
  transcript?: string;
  commentAnalysis?: CommentAnalysis;
  remakeSop?: RemakeSop;
  analyzeStatus: 'pending' | 'analyzing' | 'done' | 'failed';
  analyzedAt?: string;
  createdAt: string;
}

export interface SearchTask {
  id: string;
  searchMode: string;
  keyword?: string;
  sortType: string;
  timeFilter?: string;
  durationFilter?: string;
  category?: string;
  targetCount: number;
  minLikes: number;
  status: string;
  resultCount: number;
  createdAt: string;
}

export interface TopicEval {
  feasibilityScore: number;
  audience: string;
  hookDirections: string[];
}

export interface ScriptOutline {
  hook: string;
  body: string;
  cta: string;
  emotionPlan: string;
}

export interface StoryboardShot {
  id: number;
  duration: number;
  scene: string;
  line: string;
  camera: string;
  sound: string;
  subtitle: string;
  prompt: string;
}

export interface Storyboard {
  shots: StoryboardShot[];
}

export interface ScriptProject {
  id: string;
  topic?: string;
  category?: string;
  targetDuration: number;
  referenceVideoIds: string[];
  viralSummary?: string;
  topicEval?: TopicEval;
  outline?: ScriptOutline;
  fullCopy?: string;
  storyboard?: Storyboard;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceoverConfig {
  voiceType: string;
  speed: number;
  audioUrl?: string;
}

export interface BgmConfig {
  style: string;
  volume: number;
  audioUrl?: string;
}

export interface VideoProduction {
  id: string;
  scriptId?: string;
  characterRef?: string;
  storyboardImages?: { shots: { id: number; imageUrl: string }[] };
  videoClips?: { shots: { id: number; videoUrl: string }[] };
  voiceover?: VoiceoverConfig;
  bgmConfig?: BgmConfig;
  finalVideoUrl?: string;
  status: string;
  createdAt: string;
}

export interface ViralGene {
  id: string;
  geneType: string;
  content: string;
  effectScore: number;
  sourceVideoId?: string;
  isFavorite: boolean;
  useCount: number;
  createdAt: string;
}

export interface HotSearchItem {
  word: string;
  hotValue: number;
  position: number;
  sentenceId?: string;
  groupId?: string;
  tag?: string;
}

export interface SuggestItem {
  keyword: string;
  type?: number | string;
}

export interface CompareResult {
  overview: {
    videoId: string;
    title: string;
    overallScore: number;
    grade: string;
  }[];
  commonTraits: string[];
  viralFormula: string;
  differences: string[];
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CrawlSearchResult {
  videos: VideoRecord[];
  total: number;
  crawled: number;
  matched: number;
  taskId?: string;
}

export interface CrawlProgress {
  taskId: string;
  keyword: string;
  status: 'pending' | 'crawling' | 'completed' | 'failed';
  crawledCount: number;
  matchedCount: number;
  currentDepth: number;
  maxDepth: number;
  message: string;
}

export type PipelineStage =
  | 'crawling'
  | 'filtering'
  | 'analyzing'
  | 'comparing'
  | 'scripting'
  | 'storyboard'
  | 'done'
  | 'failed';

export interface PipelineStatus {
  taskId: string;
  keyword: string;
  stage: PipelineStage;
  progress: number;
  currentStep: string;
  videoCount: number;
  scriptId?: string;
  results?: {
    videos?: VideoRecord[];
    compareResult?: CompareResult;
    script?: ScriptProject;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}
