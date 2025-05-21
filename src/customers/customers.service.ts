import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto, businessId: string) {
    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        business: {
          connect: { id: businessId },
        },
      },
    });
  }

  async findAll(businessId: string) {
    return this.prisma.customer.findMany({
      where: { businessId },
    });
  }

  async findOne(id: string, businessId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    businessId: string,
  ) {
    try {
      return await this.prisma.customer.update({
        where: {
          id,
          businessId,
        },
        data: updateCustomerDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string, businessId: string) {
    try {
      return await this.prisma.customer.delete({
        where: {
          id,
          businessId,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      throw error;
    }
  }

  async uploadCsv(file: any, businessId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type
    if (!file.mimetype.includes('csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    try {
      const results: any[] = [];
      const customers: any[] = [];

      // Parse CSV file
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(file.buffer.toString());

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
          name: row.name || row.Name || '',
          email: row.email || row.Email || '',
          phone: row.phone || row.Phone || '',
          businessId,
        };

        // Basic validation: require either email or phone
        if (!customer.email && !customer.phone) {
          continue; // Skip invalid entries
        }

        customers.push(customer);
      }

      // Bulk insert customers
      if (customers.length > 0) {
        await this.prisma.customer.createMany({
          data: customers,
          skipDuplicates: true, // Skip duplicate email/phone combinations
        });
      }

      return {
        message: `Successfully imported ${customers.length} customers`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to process CSV file: ${error.message}`,
      );
    }
  }
}
