import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  slug: string;
  description?: string;

  price: mongoose.Types.Decimal128;
  compareAtPrice?: mongoose.Types.Decimal128;

  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

  tags: string[];
  sortOrder: number;

  categories: Types.ObjectId[];

  metaTitle?: string;
  metaDescription?: string;

  publishedAt?: Date;
  deletedAt?: Date;
  image?: string;

  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },

    slug: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: String,

    price: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    compareAtPrice: Schema.Types.Decimal128,
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },

    tags: [{ type: String }],

    sortOrder: { type: Number, default: 0 },

    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true,
      },
    ],

    metaTitle: String,
    metaDescription: String,

    publishedAt: Date,
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ categories: 1, status: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
