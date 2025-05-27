import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import { User } from '@prisma/client';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto, user: User) {
    // Get user's business from organization
    const business = await this.getUserBusiness(user.organizationId);

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        businessId: business.id,
      },
    });
  }

  async findAll(user: User) {
    const business = await this.getUserBusiness(user.organizationId);

    return this.prisma.customer.findMany({
      where: { businessId: business.id },
    });
  }

  async findOne(id: string, user: User) {
    const business = await this.getUserBusiness(user.organizationId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        businessId: business.id,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, user: User) {
    const business = await this.getUserBusiness(user.organizationId);

    // If email is being updated, check for duplicates
    if (updateCustomerDto.email) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          businessId: business.id,
          email: updateCustomerDto.email,
          NOT: { id }, // Exclude the current customer
        },
      });

      if (existingCustomer) {
        throw new BadRequestException(
          `A customer with email ${updateCustomerDto.email} already exists for this business`,
        );
      }
    }

    try {
      return await this.prisma.customer.update({
        where: {
          id,
          businessId: business.id,
        },
        data: updateCustomerDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new BadRequestException('Email already exists for this business');
      }
      throw error;
    }
  }

  async remove(id: string, user: User) {
    const business = await this.getUserBusiness(user.organizationId);

    try {
      await this.prisma.customer.delete({
        where: {
          id,
          businessId: business.id,
        },
      });

      return {
        isSuccess: true,
        message: `Customer with ID ${id} deleted successfully`,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      throw error;
    }
  }

  private async getUserBusiness(organizationId: string) {
    const business = await this.prisma.business.findFirst({
      where: { organizationId },
    });

    if (!business) {
      throw new ForbiddenException('No business found for your organization');
    }

    return business;
  }

  async uploadCsv(file: Express.Multer["File"], user: User) {
    const business = await this.getUserBusiness(user.organizationId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Accept various CSV MIME types
    const validMimeTypes = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'text/comma-separated-values',
    ];

    const isValidFile =
      validMimeTypes.some((type) => file.mimetype.includes(type)) ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (!isValidFile) {
      throw new BadRequestException(
        `Invalid file format. Expected CSV file, got: ${file.mimetype}. Please upload a .csv file.`,
      );
    }

    try {
      const results: any[] = [];
      const customers: any[] = [];

      // Parse CSV file
      await new Promise<void>((resolve, reject) => {
        if (!file.buffer) {
          reject(new Error('File buffer is empty'));
          return;
        }

        const csvContent = file.buffer.toString('utf8');
        const stream = Readable.from(csvContent);

        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve())
          .on('error', (error) => reject(error));
      });

      // Process and validate each row
      for (const row of results) {
        // Normalize field names (handle different naming conventions)
        const customer = {
          name: row.name || row.Name || row.NAME || '',
          email: row.email || row.Email || row.EMAIL || '',
          phone: row.phone || row.Phone || row.PHONE || '',
          isReturning: this.parseBoolean(
            row.isReturning || row.IsReturning || row.is_returning,
          ),
          notes: row.notes || row.Notes || row.NOTES || '',
        };

        // Basic validation: require either email or phone
        if (!customer.email && !customer.phone) {
          continue; // Skip invalid entries
        }

        // Clean up empty strings
        if (!customer.name) delete customer.name;
        if (!customer.email) delete customer.email;
        if (!customer.phone) delete customer.phone;
        if (!customer.notes) delete customer.notes;

        customers.push({
          ...customer,
          businessId: business.id,
        });
      }

      // Bulk insert customers
      if (customers.length > 0) {
        await this.prisma.customer.createMany({
          data: customers,
          skipDuplicates: true,
        });
      }

      return {
        message: `Successfully imported ${customers.length} customers`,
        totalProcessed: results.length,
        imported: customers.length,
        skipped: results.length - customers.length,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process CSV file: ${error.message}`,
      );
    }
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
  }
}
