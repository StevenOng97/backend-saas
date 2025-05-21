import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CsvUploadDto } from './dto';
import { JwtAuthGuard, BusinessOwnerGuard } from '../auth/guards';
import { User } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/decorators';

@Controller('businesses/:businessId/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(createCustomerDto, businessId);
  }

  @Get()
  @UseGuards(BusinessOwnerGuard)
  findAll(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get(':id')
  @UseGuards(BusinessOwnerGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.customersService.findOne(id, businessId);
  }

  @Patch(':id')
  @UseGuards(BusinessOwnerGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto, businessId);
  }

  @Delete(':id')
  @UseGuards(BusinessOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.customersService.remove(id, businessId);
  }

  @Post('upload-csv')
  @UseGuards(BusinessOwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadCsv(
    @UploadedFile() file: Express.Multer["File"],
    @Param('businessId', ParseUUIDPipe) businessId: string,
  ) {
    return this.customersService.uploadCsv(file, businessId);
  }
}
