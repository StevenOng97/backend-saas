import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = this.jwtService.verify(token);
      
      // Find the user by ID from the token
      const user = await this.prismaService.user.findUnique({
        where: { id: decoded.sub },
        include: {
          business: {
            include: {
              subscription: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user and business to request
      req['user'] = user;
      
      if (user.business) {
        req['business'] = user.business;
      }

      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
} 