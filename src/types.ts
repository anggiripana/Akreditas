export interface KPIConfig {
  title: string;
  column: string | null;
  operation: "sum" | "average" | "count" | "max" | "min";
  prefix?: string;
  suffix?: string;
}

export interface ChartConfig {
  title: string;
  type: "bar" | "line" | "pie" | "area";
  xAxisColumn: string;
  yAxisColumn: string;
  operation: "sum" | "average" | "count";
  description?: string;
}

export interface FilterConfig {
  column: string;
  label: string;
}

export interface ColumnConfig {
  column: string;
  type: "number" | "date" | "string";
  format: "currency" | "percentage" | "decimal" | "date" | "text";
}

export interface DashboardConfig {
  summary: string;
  kpis: KPIConfig[];
  charts: ChartConfig[];
  filters: FilterConfig[];
  columnConfig: ColumnConfig[];
}

export interface Dashboard {
  id: string;
  userId: string;
  title: string;
  description: string;
  createdAt: string;
  dataset: Record<string, any>[]; // The raw rows of data
  headers: string[]; // List of column headers
  dashboardConfig: DashboardConfig; // Gemini's suggested setup
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}
