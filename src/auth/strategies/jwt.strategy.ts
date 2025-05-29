import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([(request: Request) => {
        return request?.cookies?.access_token;
      }]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            businesses: {
              select: {
                name: true,
                id: true,
                isMainLocation: true,
                googleBusinessReviewLink: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
    });

    if (user?.organization?.businesses && user?.organization?.businesses?.length > 0) {
      (user as any).main_business_name = user?.organization?.businesses[0].name;
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
} 