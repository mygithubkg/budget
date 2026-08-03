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

/**
 * 8-hue Categorical Palette (Muted, Archival-Ink Tones)
 */
export const LEDGER_PALETTE = [
  "#A23B2E", // Food (rule-red)
  "#6B8F5E", // Groceries (sage green)
  "#2F3F6B", // Travel (stamp-indigo)
  "#7A5232", // Rent (umber brown)
  "#5B6670", // Utilities (slate grey)
  "#6B4C6B", // Entertain (muted plum)
  "#C08A2E", // Shopping (ochre)
  "#3F7368", // Health (dusty teal)
];

export const CATEGORICAL_PALETTE = LEDGER_PALETTE;

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#A23B2E",
  "Food & Dining": "#A23B2E",
  Groceries: "#6B8F5E",
  "Travel/Transport": "#2F3F6B",
  Travel: "#2F3F6B",
  Rent: "#7A5232",
  Utilities: "#5B6670",
  Entertainment: "#6B4C6B",
  Shopping: "#C08A2E",
  "Health/Medical": "#3F7368",
  Health: "#3F7368",
  Education: "#7A5232",
  "Salary/Income": "#8A6A2E",
  Income: "#8A6A2E",
  Miscellaneous: "#5B6670",
};

export const DEFAULT_CATEGORY_COLOR = "#2F3F6B";
