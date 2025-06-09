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
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User, TemplateType } from '@prisma/client';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('type') type?: TemplateType,
  ) {
    if (type) {
      return this.templatesService.findByType(type, user);
    }
    return this.templatesService.findAll(user);
  }

  @Get('sms-templates')
  async findSmsTemplates(@CurrentUser() user: User) {
    return this.templatesService.findSmsTemplates(user);
  }

  @Get('email-templates')
  async findEmailTemplates(@CurrentUser() user: User) {
    return this.templatesService.findEmailTemplates(user);
  }

  @Get('default-templates')
  async findDefaultTemplates(@CurrentUser() user: User) {
    return this.templatesService.findDefaultTemplates(user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.templatesService.findOne(id, user);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createTemplateDto: CreateTemplateDto, @CurrentUser() user: User) {
    const businessId = (user as any).main_business_id;
    createTemplateDto.businessId = businessId;
    return this.templatesService.create(createTemplateDto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser() user: User
  ) {
    return this.templatesService.update(id, updateTemplateDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.templatesService.remove(id, user);
  }
} 