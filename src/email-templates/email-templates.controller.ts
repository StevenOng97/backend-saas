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
import { EmailTemplatesService } from './email-templates.service'
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User } from '@prisma/client';

@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createEmailTemplateDto: CreateEmailTemplateDto, @CurrentUser() user: User) {
    const businessId = (user as any).main_business_id;
    createEmailTemplateDto.businessId = businessId;
    return this.emailTemplatesService.create(createEmailTemplateDto, user);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.emailTemplatesService.update(id, updateEmailTemplateDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.emailTemplatesService.remove(id, user);
  }
} 