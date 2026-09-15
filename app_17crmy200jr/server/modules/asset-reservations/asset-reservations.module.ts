import { Module } from '@nestjs/common';
import { AssetReservationsController } from './asset-reservations.controller';
import { AssetReservationsService } from './asset-reservations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { FixedAssetsModule } from '../fixed-assets/fixed-assets.module';

@Module({
  imports: [NotificationsModule, FixedAssetsModule],
  controllers: [AssetReservationsController],
  providers: [AssetReservationsService],
  exports: [AssetReservationsService],
})
export class AssetReservationsModule {}