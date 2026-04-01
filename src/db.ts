export interface Product {
  id?: string;
  barcode: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  image?: string; // base64 string
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SaleItem {
  productId: string;
  barcode: string;
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
}

export interface Sale {
  id?: string;
  date: Date;
  items: SaleItem[];
  totalBuyPrice: number;
  totalSellPrice: number;
  subtotal?: number;
  discount?: number;
  serviceCharge?: number;
  profit: number;
  customerName?: string;
  customerPhone?: string;
  userId?: string;
  createdAt?: Date;
}

