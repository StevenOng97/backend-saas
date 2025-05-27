import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  HttpCode, 
  HttpStatus, 
  ValidationPipe, 
  UsePipes,
  ParseUUIDPipe,
  UseGuards
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto';
import { JwtAuthGuard, BusinessOwnerGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User } from '@prisma/client';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createBusinessDto: CreateBusinessDto, @CurrentUser() user: User) {
    return this.businessService.create(createBusinessDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.businessService.findAll(user);
  }

  @Get(':id')
  @UseGuards(BusinessOwnerGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.businessService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(BusinessOwnerGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateBusinessDto: UpdateBusinessDto,
    @CurrentUser() user: User
  ) {
    return this.businessService.update(id, updateBusinessDto, user);
  }

  @Delete(':id')
  @UseGuards(BusinessOwnerGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.businessService.remove(id, user);
  }
} 