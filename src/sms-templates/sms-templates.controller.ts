import { 
  Controller, 
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
import { SmsTemplatesService } from './sms-templates.service';
import { CreateSmsTemplateDto, UpdateSmsTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User } from '@prisma/client';

@Controller('sms-templates')
@UseGuards(JwtAuthGuard)
export class SmsTemplatesController {
  constructor(private readonly smsTemplatesService: SmsTemplatesService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createSmsTemplateDto: CreateSmsTemplateDto, @CurrentUser() user: User) {
    const businessId = (user as any).main_business_id;
    createSmsTemplateDto.businessId = businessId;
    return this.smsTemplatesService.create(createSmsTemplateDto, user);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateSmsTemplateDto: UpdateSmsTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.smsTemplatesService.update(id, updateSmsTemplateDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.smsTemplatesService.remove(id, user);
  }
} 