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
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../decorators';
import { User, CampaignType } from '@prisma/client';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('type') type?: CampaignType,
  ) {
    if (type) {
      return this.campaignsService.findByType(type, user);
    }
    return this.campaignsService.findAll(user);
  }

  @Get('sms-templates')
  async findSmsTemplates(@CurrentUser() user: User) {
    return this.campaignsService.findSmsTemplates(user);
  }

  @Get('email-templates')
  async findEmailTemplates(@CurrentUser() user: User) {
    return this.campaignsService.findEmailTemplates(user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.findOne(id, user);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() createCampaignDto: CreateCampaignDto, @CurrentUser() user: User) {
    const businessId = (user as any).main_business_id;
    createCampaignDto.businessId = businessId;
    return this.campaignsService.create(createCampaignDto, user);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser() user: User
  ) {
    return this.campaignsService.update(id, updateCampaignDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return await this.campaignsService.remove(id, user);
  }
} 