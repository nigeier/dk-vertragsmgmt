import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { EmailService } from '../email/email.service';
import { Notification } from '@prisma/client';

export interface NotificationWithEmail {
  userId: string;
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Get user notifications
   */
  async findAll(user: AuthenticatedUser, unreadOnly = false): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(user: AuthenticatedUser): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, user: AuthenticatedUser): Promise<Notification> {
    const notification = await this.getNotification(id, user);

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(user: AuthenticatedUser): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete a notification
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const notification = await this.getNotification(id, user);

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });
  }

  /**
   * Create a notification for a user
   */
  async create(data: NotificationWithEmail): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        link: data.link,
        userId: data.userId,
      },
    });

    // Optionally send email notification
    if (data.sendEmail) {
      await this.sendEmailForNotification(data);
    }

    return notification;
  }

  /**
   * Send email for a notification
   */
  private async sendEmailForNotification(data: NotificationWithEmail): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user) {
        this.logger.warn(`User ${data.userId} not found for email notification`);
        return;
      }

      // Send generic email
      const html = `
        <h2>${data.title}</h2>
        <p>${data.message}</p>
        ${data.link ? `<p><a href="${data.link}">Zum Vertrag</a></p>` : ''}
      `;

      await this.emailService.sendGenericEmail(user.email, data.title, html);
      this.logger.log(`Email notification sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${String(error)}`);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Create notifications for multiple users
   */
  async createMany(
    userIds: string[],
    data: { title: string; message: string; link?: string },
  ): Promise<number> {
    const notifications = userIds.map((userId) => ({
      title: data.title,
      message: data.message,
      link: data.link,
      userId,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
    });

    return result.count;
  }

  /**
   * Get notification and verify ownership
   */
  private async getNotification(id: string, user: AuthenticatedUser): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Benachrichtigung nicht gefunden');
    }

    if (notification.userId !== user.id) {
      throw new ForbiddenException('Zugriff verweigert');
    }

    return notification;
  }
}
