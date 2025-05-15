import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    
    if (!resendApiKey) {
      this.logger.error('Resend API key not provided');
      throw new Error('Resend API key is required');
    }
    
    this.resend = new Resend(resendApiKey);
    this.from = this.configService.get<string>('MAIL_FROM') || 'noreply@example.com';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Password Reset Request',
        html: `
          <div>
            <h1>Password Reset</h1>
            <p>You requested a password reset. Please click on the button below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">
              Reset Password
            </a>
            <p>Or copy and paste the following link in your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
          </div>
        `,
        text: `You requested a password reset. Please click on the following link to reset your password: ${resetUrl}. This link will expire in 1 hour.`,
      });

      if (error) {
        this.logger.error(`Failed to send password reset email: ${error.message}`);
        return false;
      }

      this.logger.log(`Password reset email sent: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return false;
    }
  }
  
  async sendInviteEmail(email: string, inviteCode: string, message: string): Promise<boolean> {
    const inviteUrl = `${this.frontendUrl}/accept-invite?code=${inviteCode}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'You have been invited!',
        html: `
          <div>
            <h1>Invitation</h1>
            <p>${message}</p>
            <p>Click the button below to accept this invitation:</p>
            <a href="${inviteUrl}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">
              Accept Invitation
            </a>
            <p>Or copy and paste the following link in your browser:</p>
            <p>${inviteUrl}</p>
          </div>
        `,
        text: `${message}\n\nClick the following link to accept the invitation: ${inviteUrl}`,
      });

      if (error) {
        this.logger.error(`Failed to send invite email: ${error.message}`);
        return false;
      }

      this.logger.log(`Invite email sent: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invite email: ${error.message}`);
      return false;
    }
  }
} 