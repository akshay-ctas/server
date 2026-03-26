import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  REFEND_INITIATED = 'REFEND_INITIATED',
  REFEND_SUCCESS = 'REFEND_SUCCESS',
}

export enum RecipientType {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface INotification extends Document {
  type: NotificationType;
  recipientType: RecipientType;
  recipientId?: Types.ObjectId | null;

  title: string;
  message: string;

  entityId?: Types.ObjectId | string | null;
  entityType?: 'Order' | 'Payment' | null;

  isRead: boolean;
  readAt?: Date | null;

  actionUrl?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: Object.values(RecipientType),
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['Order', 'Payment', null],
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },

    actionUrl: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ recipientType: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
