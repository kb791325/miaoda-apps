import { Module } from '@nestjs/common';
import { BitableClient } from '@server/common/utils/bitable-client';

/** feishu-bitable 统一调用封装的共享提供模块：业务模块统一 import 复用 */
@Module({
  providers: [BitableClient],
  exports: [BitableClient],
})
export class BitableModule {}
