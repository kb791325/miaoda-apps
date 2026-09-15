import { Module } from '@nestjs/common';
import { UndoController } from './undo.controller';
import { UndoService } from './undo.service';

@Module({
  controllers: [UndoController],
  providers: [UndoService],
})
export class UndoModule {}
