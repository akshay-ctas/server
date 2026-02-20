import mongoose, { Document, Schema } from 'mongoose';

export interface IProductVariant extends Document {
  productId: mongoose.Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    sku: { type: String, unique: true, required: true },

    color: String,
    metalType: String,
    stoneType: String,
    size: String,

    price: {
      type: Schema.Types.Decimal128,
      required: true,
    },

    compareAtPrice: Schema.Types.Decimal128,

    stock: { type: Number, default: 0 },

    isAvailable: { type: Boolean, default: true },

    weight: Number,
  },
  { timestamps: true }
);

productVariantSchema.index({ productId: 1 });
productVariantSchema.index({ productId: 1, isAvailable: 1 });

export const ProductVariant = mongoose.model<IProductVariant>(
  'ProductVariant',
  productVariantSchema
);
