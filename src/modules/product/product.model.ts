import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProductVariant {
  _id: Types.ObjectId;
  sku: string;
  color?: string;
  metalType?: string;
  stoneType?: string;
  size?: string;
  price: mongoose.Types.Decimal128;
  compareAtPrice?: mongoose.Types.Decimal128;
  stock: number;
  isAvailable: boolean;
  weight?: number;
}

export interface IProductImage {
  _id?: Types.ObjectId;
  variantId?: Types.ObjectId;
  url: string;
  altText?: string;
  position: number;
  isPrimary: boolean;
  width?: number;
  height?: number;
}

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
  variants: IProductVariant[];
  images: IProductImage[];
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    color: { type: String, trim: true },
    metalType: { type: String, trim: true },
    stoneType: { type: String, trim: true },
    size: { type: String, trim: true },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    stock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },
    weight: { type: Number },
  },
  { _id: true }
);

const ProductImageSchema = new Schema<IProductImage>(
  {
    variantId: { type: Schema.Types.ObjectId },
    url: { type: String, required: true },
    altText: { type: String },
    position: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },

    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },

    tags: [{ type: String }],
    sortOrder: { type: Number, default: 0 },

    categories: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],

    variants: {
      type: [ProductVariantSchema],
      default: [],
    },

    images: {
      type: [ProductImageSchema],
      default: [],
    },

    metaTitle: { type: String },
    metaDescription: { type: String },

    publishedAt: { type: Date },
    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

productSchema.index({ slug: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ categories: 1, status: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'images.isPrimary': 1 });
productSchema.index({ 'images.position': 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
