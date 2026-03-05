import { Request, Response } from 'express';
import z, { ZodError } from 'zod';
import { IAddress, User } from './user.model.js';
import mongoose from 'mongoose';
import { treeifyError } from 'zod/v4/core';

export class UserController {
  constructor() {
    this.addAddress = this.addAddress.bind(this);
    this.editAddress = this.editAddress.bind(this);
    this.getAddresses = this.getAddresses.bind(this);
  }
  async addAddress(req: Request, res: Response) {
    try {
      const userId = req.params.id as string;

      console.log('userId', userId);
      console.log('body', req.body);

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const addressData = this.validateAddress(req.body);

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: 'User not found' });

      if (addressData.isDefault) {
        userDoc.addresses.forEach((addr) => (addr.isDefault = false));
      }

      userDoc.addresses.push(addressData);
      await userDoc.save();
      res.status(201).json({
        message: 'Address added successfully',
        addresses: userDoc.addresses,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: treeifyError(error),
        });
      }
      console.error('Add address error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getAddresses(req: Request, res: Response) {
    try {
      const userId = req.params.id as string;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: 'User not found' });

      res.status(200).json({
        message: 'Addresses fetched successfully',
        addresses: userDoc.addresses,
      });
    } catch (error) {
      console.error('Get addresses error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async editAddress(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const addressId = req.params.addressId as string;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ message: 'Invalid address ID' });
      }

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: 'User not found' });

      const addressIndex = userDoc.addresses.findIndex(
        (addr) => addr._id?.toString() === addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({ message: 'Address not found' });
      }

      const updatedData = this.validateAddress(req.body);

      if (updatedData.isDefault) {
        userDoc.addresses.forEach((addr) => (addr.isDefault = false));
      }

      Object.assign(userDoc.addresses[addressIndex], updatedData);

      await userDoc.save();

      res.status(200).json({
        message: 'Address updated successfully',
        addresses: userDoc.addresses,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: treeifyError(error),
        });
      }
      console.error('Edit address error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteAddress(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const addressId = req.params.addressId as string;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ message: 'Invalid address ID' });
      }

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: 'User not found' });

      const addressIndex = userDoc.addresses.findIndex(
        (addr) => addr._id?.toString() === addressId
      );

      if (addressIndex === -1) {
        return res.status(404).json({ message: 'Address not found' });
      }

      userDoc.addresses.splice(addressIndex, 1);
      await userDoc.save();

      res.status(200).json({
        message: 'Address deleted successfully',
        addresses: userDoc.addresses,
      });
    } catch (error) {
      console.error('Delete address error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
  private validateAddress(data: any): IAddress {
    const schema = z.object({
      type: z.enum(['shipping', 'billing']).default('shipping'),
      fullName: z.string().min(2, 'Full name is required'),
      addressLine1: z.string().min(2, 'Address line 1 is required'),
      addressLine2: z.string().optional(),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      country: z.string().default('India'),
      zipCode: z.string().min(2, 'Zip code is required'),
      phone: z.string().min(10, 'Phone number is required'),
      isDefault: z.boolean().optional(),
    });

    return schema.parse(data);
  }
}
