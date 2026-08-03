export const DEFAULT_CATEGORIES: string[] = [
  "Food",
  "Groceries",
  "Travel/Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health/Medical",
  "Education",
  "Salary/Income",
  "Miscellaneous",
];

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f59e0b", // Amber
  Groceries: "#10b981", // Emerald
  "Travel/Transport": "#3b82f6", // Blue
  Rent: "#8b5cf6", // Purple
  Utilities: "#06b6d4", // Cyan
  Entertainment: "#ec4899", // Pink
  Shopping: "#f43f5e", // Rose
  "Health/Medical": "#14b8a6", // Teal
  Education: "#6366f1", // Indigo
  "Salary/Income": "#22c55e", // Green
  Miscellaneous: "#64748b", // Slate
};

export const DEFAULT_CATEGORY_COLOR = "#8b5cf6";
