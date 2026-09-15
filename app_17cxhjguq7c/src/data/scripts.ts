// EXPORTS: IShot, IScript, ScriptInput, MOCK_SCRIPTS
export interface IShot {
  shotNumber: number;
  sceneDescription: string;
  cameraLanguage: string;
  dialogue: string;
  durationSec: number;
  bgmSuggestion: string;
  transition: string;
  referenceVideo?: string;
}

export interface IScript {
  id: string;
  scriptTitle: string;
  contentType: string;
  duration: number;
  theme: string;
  shots: IShot[];
  createdAt: string;
  updatedAt: string;
}

export type ScriptInput = Omit<IScript, 'id' | 'createdAt' | 'updatedAt'>;

export const MOCK_SCRIPTS: IScript[] = [
  {
    id: 's1',
    scriptTitle: 'AI做视频保姆级教程',
    contentType: '知识科普',
    duration: 58,
    theme: 'AI视频创作入门',
    shots: [
      { shotNumber: 1, sceneDescription: '黑底屏幕亮起，AI软件界面逐个弹出', cameraLanguage: '特写 + 快速推镜', dialogue: '不会剪辑也能做出电影感视频？今天一次讲透。', durationSec: 6, bgmSuggestion: '科技感电子音效', transition: '闪切', referenceVideo: 'https://v.douyin.com/iRyuSx/' },
      { shotNumber: 2, sceneDescription: '真人出镜口播，背后白板写流程图', cameraLanguage: '中景固定机位', dialogue: '第一步，把爆款文案丢给AI生成分镜脚本。', durationSec: 15, bgmSuggestion: '轻快电子鼓点', transition: '滑动' },
      { shotNumber: 3, sceneDescription: '屏幕录制：分镜画面自动生成过程', cameraLanguage: '屏幕特写 + 局部放大', dialogue: '第二步，一键生成分镜画面，风格还能统一。', durationSec: 22, bgmSuggestion: '轻快电子鼓点', transition: '缩放' },
      { shotNumber: 4, sceneDescription: '成品视频三连展示，结尾引导关注', cameraLanguage: '三画面拼接', dialogue: '第三步合成导出，关注我，下期教你配音。', durationSec: 15, bgmSuggestion: '收尾上扬音效', transition: '无' },
    ],
    createdAt: '2026-08-23 11:20',
    updatedAt: '2026-08-24 15:02',
  },
  {
    id: 's2',
    scriptTitle: '办公室解压好物测评',
    contentType: '好物种草',
    duration: 45,
    theme: '工位解压神器盘点',
    shots: [
      { shotNumber: 1, sceneDescription: '俯拍桌面，手依次拍五件好物', cameraLanguage: '俯拍全景', dialogue: '打工人的快乐，五件解压神器就够了。', durationSec: 8, bgmSuggestion: 'Lo-fi 轻爵士', transition: '闪切', referenceVideo: 'https://v.douyin.com/iKqtAw/' },
      { shotNumber: 2, sceneDescription: '逐件手持特写 + 使用演示', cameraLanguage: '手部特写跟拍', dialogue: '第一个，捏捏乐，开会摸鱼两不误。', durationSec: 25, bgmSuggestion: 'Lo-fi 轻爵士', transition: '滑动' },
      { shotNumber: 3, sceneDescription: '全部好物摆回桌面，字幕总结', cameraLanguage: '缓慢拉远', dialogue: '你最想要哪个？评论区告诉我。', durationSec: 12, bgmSuggestion: 'Lo-fi 轻爵士', transition: '无' },
    ],
    createdAt: '2026-08-24 17:45',
    updatedAt: '2026-08-24 17:45',
  },
  {
    id: 's3',
    scriptTitle: '深夜食堂治愈企划',
    contentType: '生活vlog',
    duration: 62,
    theme: '一人食的仪式感',
    shots: [
      { shotNumber: 1, sceneDescription: '城市夜景延时，镜头落向厨房亮灯的窗', cameraLanguage: '大远景推进', dialogue: '晚上十一点，只有厨房还亮着。', durationSec: 8, bgmSuggestion: 'City Pop 慢速', transition: '淡入', referenceVideo: 'https://v.douyin.com/iWenRt/' },
      { shotNumber: 2, sceneDescription: '慢镜头：食材下锅、汤汁翻滚', cameraLanguage: '微距慢镜头', dialogue: '今天给自己的奖励，是一碗豪华泡面。', durationSec: 20, bgmSuggestion: 'City Pop 慢速', transition: '叠化' },
      { shotNumber: 3, sceneDescription: '端面上桌，热气腾腾，人物入座', cameraLanguage: '过肩镜头', dialogue: '一个人也要好好吃饭。', durationSec: 18, bgmSuggestion: 'City Pop 慢速', transition: '滑动' },
      { shotNumber: 4, sceneDescription: '吃完的空碗，窗外夜景收尾', cameraLanguage: '特写拉远', dialogue: '晚安，明天见。', durationSec: 16, bgmSuggestion: '收尾钢琴单音', transition: '无' },
    ],
    createdAt: '2026-08-25 21:10',
    updatedAt: '2026-08-26 09:20',
  },
  {
    id: 's4',
    scriptTitle: '爆款文案黄金3秒法则',
    contentType: '知识科普',
    duration: 75,
    theme: '开场文案方法论',
    shots: [
      { shotNumber: 1, sceneDescription: '大字报：3秒定生死', cameraLanguage: '文字动效特写', dialogue: '用户只给你3秒，文案怎么写才能留人？', durationSec: 6, bgmSuggestion: '节奏鼓点', transition: '闪切' },
      { shotNumber: 2, sceneDescription: '真人口播 + 案例弹幕展示', cameraLanguage: '中景 + 花字', dialogue: '三个公式：反常识、数字承诺、身份代入。', durationSec: 45, bgmSuggestion: '节奏鼓点', transition: '缩放' },
      { shotNumber: 3, sceneDescription: '案例对比前后数据截图', cameraLanguage: '分屏对比', dialogue: '套用后完播率翻倍，赶紧去试。', durationSec: 24, bgmSuggestion: '收尾上扬音效', transition: '无' },
    ],
    createdAt: '2026-08-26 10:30',
    updatedAt: '2026-08-26 10:30',
  },
];
