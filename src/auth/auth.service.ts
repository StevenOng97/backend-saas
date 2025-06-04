import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as randomstring from 'randomstring';
import {
  SignUpDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TokenResponseDto,
} from './dto/auth.dto';
import { UserRole } from '@prisma/client';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  // Helper function to create JWT token
  private createToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  // Helper function to set auth cookie
  private setAuthCookie(response: Response, token: string): void {
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.reviewroket.com', // The leading dot allows sharing across subdomains
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  // Helper function to select safe user fields
  private async getUserSafeFields(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
              },
            },
          },
        },
      },
    });

    if (
      user?.organization?.businesses &&
      user?.organization?.businesses?.length > 0
    ) {
      (user as any).main_business_name = user?.organization?.businesses[0].name;
      (user as any).main_business_id = user?.organization?.businesses[0].id;
    }

    return user;
  }

  // Validate user for local strategy
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return this.getUserSafeFields(user.id);
  }

  // Sign up new user
  async signUp(signUpDto: SignUpDto): Promise<{ message: string }> {
    const { email, password, firstName, lastName } = signUpDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {},
    });

    // Create user
    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        organizationId: organization.id,
      },
    });

    return { message: 'User registered successfully.' };
  }

  // Login user
  async login(
    loginDto: LoginDto,
    response: Response,
  ): Promise<{ token: string; user: any }> {
    const { email, password } = loginDto;

    // Use the validateUser method to check credentials
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.createToken(user.id);

    // Set the token as an HTTP-only cookie
    this.setAuthCookie(response, accessToken);

    return {
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        main_business_name: user.main_business_name,
        main_business_id: user.main_business_id,
      },
    };
  }

  // Request password reset
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email');
    }

    // Generate reset token
    const resetToken = randomstring.generate({
      length: 32,
      charset: 'alphanumeric',
    });

    // Calculate expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing reset tokens for this user
    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new password reset record
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Password reset instructions sent to your email' };
  }

  // Reset password with token
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find the password reset record
    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    await this.prisma.user.update({
      where: { id: passwordReset.userId },
      data: {
        password: hashedPassword,
      },
    });

    // Delete the password reset record
    await this.prisma.passwordReset.delete({
      where: { id: passwordReset.id },
    });

    return {
      message:
        'Password reset successful. You can now log in with your new password.',
    };
  }

  // Google OAuth login/signup
  async googleLogin(
    googleUser: any,
    response: Response,
  ): Promise<{ token: string; user: any }> {
    const { googleId, email, firstName, lastName } = googleUser;

    // Check if user already exists by Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    // If not found by Google ID, try email
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Link existing account to Google
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
          },
        });
      } else {
        // Create organization
        const organization = await this.prisma.organization.create({
          data: {},
        });

        // Create new user
        user = await this.prisma.user.create({
          data: {
            googleId,
            email,
            firstName,
            lastName,
            role: UserRole.ADMIN,
            organizationId: organization.id,
          },
        });
      }
    }

    // Get safe user data
    const safeUser: any = await this.getUserSafeFields(user.id);

    // Generate JWT token
    const accessToken = this.createToken(user.id);

    // Set the token as an HTTP-only cookie
    this.setAuthCookie(response, accessToken);

    return {
      token: accessToken,
      user: {
        id: safeUser?.id || '',
        email: safeUser?.email || '',
        firstName: safeUser?.firstName || '',
        lastName: safeUser?.lastName || '',
        role: safeUser?.role || '',
        main_business_name: safeUser?.main_business_name || '',
        main_business_id: safeUser?.main_business_id || '',
      },
    };
  }

  // Logout user
  async logout(response: Response): Promise<{ message: string }> {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.reviewroket.com',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }
}
