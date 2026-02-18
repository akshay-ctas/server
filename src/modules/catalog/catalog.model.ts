import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  url: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;

  parentId?: Types.ObjectId | null;
  children?: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
    },

    level: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    imageUrl: {
      type: String,
    },

    metaTitle: {
      type: String,
    },

    metaDescription: {
      type: String,
    },

    // parent category
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },

    // children categories
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
  },
  {
    timestamps: true, // createdAt & updatedAt auto
  }
);

// compound index like prisma @@index([isActive, sortOrder])
CategorySchema.index({ isActive: 1, sortOrder: 1 });

export const CategoryModel = mongoose.model<ICategory>(
  'Category',
  CategorySchema
);
