export class OrderResponseDTO {
  id!: string;

  user!: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  items!: {
    productId: string;
    productTitle?: string;
    productSlug?: string;
    image?: string;

    variantId?: string;
    sku?: string;
    price?: number;

    quantity: number;
    total: number;
  }[];

  pricing!: {
    subtotal: number;
    discount: number;
    tax: number;
    shipping: number;
    total: number;
  };

  shippingAddress!: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    phone: string;
  };

  paymentMethod!: string;
  paymentStatus!: string;
  status!: string;

  createdAt!: Date;

  static fromOrder(order: any): OrderResponseDTO {
    const dto = new OrderResponseDTO();

    dto.id = order._id.toString();
    dto.user = this.mapUser(order.userId);
    dto.items = this.mapItems(order.items);
    dto.pricing = order.pricing;
    dto.shippingAddress = order.shippingAddress;

    dto.paymentMethod = order.paymentMethod;
    dto.paymentStatus = order.paymentStatus;
    dto.status = order.status;

    dto.createdAt = order.createdAt;

    return dto;
  }

  static fromOrderArr(order: any): OrderResponseDTO {
    const dto = new OrderResponseDTO();

    dto.id = order._id.toString();
    dto.user = this.mapUser(order.userId);
    dto.items = this.mapItems(order.items);
    dto.pricing = order.pricing;
    // dto.shippingAddress = order.shippingAddress;

    dto.paymentMethod = order.paymentMethod;
    dto.paymentStatus = order.paymentStatus;
    dto.status = order.status;

    dto.createdAt = order.createdAt;

    return dto;
  }

  static fromOrderArray(orders: any[]): OrderResponseDTO[] {
    return orders.map((order) => this.fromOrderArr(order));
  }
  private static mapUser(user: any) {
    const name = `${user.firstName} ${user.lastName}`;
    return {
      id: user._id.toString(),
      name,
      email: user.email,
    };
  }

  private static mapItems(items: any[]) {
    return items.map((item) => {
      const product = item.productId;

      const variant = product?.variants?.find(
        (v: any) => v._id.toString() === item.variantId.toString()
      );

      const variantImage = product?.images?.find(
        (img: any) =>
          img.variantId &&
          img.variantId.toString() === item.variantId.toString()
      );

      const primaryImage = product?.images?.find(
        (img: any) => img.isPrimary === true
      );

      const image = variantImage?.url || primaryImage?.url || null;

      return {
        productId: product?._id?.toString(),
        productTitle: product?.title,
        productSlug: product?.slug,
        image,

        variantId: item.variantId?.toString(),
        sku: variant?.sku,
        price: variant?.price,

        quantity: item.quantity,
        total: item.total,
      };
    });
  }
}
