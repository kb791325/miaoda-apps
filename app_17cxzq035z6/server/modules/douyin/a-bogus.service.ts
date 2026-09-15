import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import path from 'path';
import vm from 'vm';

/**
 * a_bogus 签名服务
 *
 * 使用 Node.js vm 模块在沙箱中运行真实签名算法，模拟浏览器环境。
 * onModuleInit 时读取 abogus/ 目录下 3 个 JS 文件并拼接，
 * 首次调用 sign() 时初始化 vm 沙箱并编译 makeABogus 函数。
 */
@Injectable()
export class ABogusService implements OnModuleInit {
  private readonly logger = new Logger(ABogusService.name);
  private combinedCode = '';
  private signFn: ((queryString: string, idx: number) => string) | null = null;

  async onModuleInit(): Promise<void> {
    try {
      const abogusDir = path.join(__dirname, 'abogus');
      const files = ['utils.js', 'sm3.js', 'vm_decode.js'];
      const codeParts: string[] = [];
      for (const file of files) {
        const content = readFileSync(path.join(abogusDir, file), 'utf-8');
        codeParts.push(content);
      }
      this.combinedCode = codeParts.join('\n');
      this.logger.log(
        `a_bogus 签名脚本加载完成，共 ${files.length} 个文件，` +
          `总长度 ${this.combinedCode.length} 字符`,
      );
    } catch (error) {
      this.logger.error('a_bogus 签名脚本加载失败: ' + String(error));
    }
  }

  /**
   * 对 query string 生成 a_bogus 签名
   * 懒加载：首次调用时初始化沙箱
   */
  sign(queryString: string): string {
    if (!this.signFn) {
      this.initSandbox();
    }
    if (!this.signFn) return '';
    try {
      return this.signFn(queryString, 0);
    } catch (error) {
      this.logger.warn('a_bogus 签名失败: ' + String(error));
      return '';
    }
  }

  /**
   * 初始化 vm 沙箱并编译签名函数
   * 结果缓存到 this.signFn
   */
  private initSandbox(): void {
    if (!this.combinedCode) {
      this.logger.error('a_bogus 签名脚本未加载，无法初始化沙箱');
      return;
    }

    const navigatorObj = {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: 'zh-CN',
      languages: ['zh-CN', 'zh', 'en'],
      vendor: 'Google Inc.',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      cookieEnabled: true,
      onLine: true,
      doNotTrack: null,
    };

    const screenObj = {
      availWidth: 1920,
      availHeight: 1040,
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
    };

    const performanceObj = {
      now: () => Date.now(),
      timing: { navigationStart: Date.now() },
    };

    const documentObj = {
      cookie: '',
      referrer: 'https://www.douyin.com/',
      createElement: () => ({
        getContext: () => ({
          fillText() {},
          fillRect() {},
          beginPath() {},
          arc() {},
          closePath() {},
          fill() {},
          getImageData: () => ({ data: new Uint8Array(0) }),
          measureText: () => ({ width: 0 }),
          canvas: { width: 0, height: 0 },
        }),
        style: {},
        setAttribute() {},
        appendChild() {},
      }),
      documentElement: { style: {} },
    };

    const windowObj: Record<string, unknown> = {};

    const sandbox: Record<string, unknown> = {
      // 浏览器环境 mock
      navigator: navigatorObj,
      window: windowObj,
      document: documentObj,
      screen: screenObj,
      performance: performanceObj,

      // 尺寸 / 像素比挂到 window 上
      innerWidth: 1920,
      innerHeight: 1040,
      outerWidth: 1920,
      outerHeight: 1080,
      devicePixelRatio: 1,

      // JS 内置对象
      Date,
      Math,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      JSON,
      Error,
      TypeError,
      RangeError,
      SyntaxError,

      // 二进制 / 集合类型
      Uint8Array,
      Int32Array,
      ArrayBuffer,
      DataView,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
      Symbol,
      Reflect,
      Proxy,

      // base64
      btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
      atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),

      // 计时器
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,

      // 静默 console
      console: {
        log: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        info: () => undefined,
        debug: () => undefined,
        dir: () => undefined,
      },
    };

    // window 自引用 + 挂载浏览器对象
    windowObj.window = windowObj;
    windowObj.navigator = navigatorObj;
    windowObj.document = documentObj;
    windowObj.screen = screenObj;
    windowObj.performance = performanceObj;
    windowObj.innerWidth = 1920;
    windowObj.innerHeight = 1040;
    windowObj.outerWidth = 1920;
    windowObj.outerHeight = 1080;
    windowObj.devicePixelRatio = 1;

    const context = vm.createContext(sandbox);

    // 拼接完整代码，并在末尾包装返回 makeABogus
    const fullCode = `
${this.combinedCode}
;
if (typeof makeABogus === 'function') {
  makeABogus;
} else {
  throw new Error('makeABogus function not found in sandbox');
}
`;

    try {
      const fn = vm.runInContext(fullCode, context) as (
        query: string,
        idx: number,
      ) => string;
      this.signFn = fn;
      this.logger.log('a_bogus 签名沙箱初始化完成');
    } catch (error) {
      this.logger.error('a_bogus 沙箱初始化失败: ' + String(error));
      // 兜底：返回空字符串，调用方需处理
      this.signFn = () => '';
    }
  }
}
