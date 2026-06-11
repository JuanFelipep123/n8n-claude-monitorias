import { Controller, Get, Param } from '@nestjs/common';
import { SalasService } from './salas.service';

@Controller('salas')
export class SalasController {
  constructor(private readonly salasService: SalasService) {}

  @Get(':sede')
  getSalasBySede(@Param('sede') sede: string) {
    return this.salasService.getSalasBySede(sede);
  }
}
