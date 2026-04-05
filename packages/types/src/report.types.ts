export interface SalesSummary {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface KpiDashboard {
  totalRevenue: number;
  revenueChange: number; // percentage vs previous period
  totalOrders: number;
  ordersChange: number;
  newCustomers: number;
  customersChange: number;
  averageOrderValue: number;
  aovChange: number;
  lowStockProducts: number;
  pendingReturns: number;
}

export interface TopProduct {
  id: string;
  name: string;
  slug: string;
  soldCount: number;
  revenue: number;
  imageUrl: string | null;
}
