import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalasModule } from './salas/salas.module';

@Module({
  imports: [SalasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
