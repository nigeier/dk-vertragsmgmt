import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user notifications
   */
  async findAll(user: AuthenticatedUser, unreadOnly = false): Promise<Notification[]> {
    const dbUser = await this.getDbUser(user.id);

    return this.prisma.notification.findMany({
      where: {
        userId: dbUser.id,
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
    const dbUser = await this.getDbUser(user.id);

    const count = await this.prisma.notification.count({
      where: {
        userId: dbUser.id,
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
    const dbUser = await this.getDbUser(user.id);

    const result = await this.prisma.notification.updateMany({
      where: {
        userId: dbUser.id,
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
  async create(data: {
    userId: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        link: data.link,
        userId: data.userId,
      },
    });
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
  private async getNotification(
    id: string,
    user: AuthenticatedUser,
  ): Promise<Notification> {
    const dbUser = await this.getDbUser(user.id);

    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== dbUser.id) {
      throw new ForbiddenException('Access denied');
    }

    return notification;
  }

  /**
   * Get database user by Keycloak ID
   */
  private async getDbUser(keycloakId: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
