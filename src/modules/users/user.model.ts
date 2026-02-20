import mongoose, { Document, Schema } from 'mongoose';

export interface IAddress {
  type: 'shipping' | 'billing';
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;

  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';

  addresses: IAddress[];

  wishlist: mongoose.Types.ObjectId[];

  isEmailVerified: boolean;
  isActive: boolean;
  role: 'customer' | 'admin' | 'manager';

  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    type: {
      type: String,
      enum: ['shipping', 'billing'],
      required: true,
    },
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    password: {
      type: String,
      required: true,
      select: true,
    },
    phone: String,
    avatar: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    addresses: [addressSchema],

    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ['customer', 'admin', 'manager'],
      default: 'customer',
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>('User', userSchema);

export { User };
