import React from "react";
import {
  Utensils,
  ShoppingBag,
  ShoppingCart,
  Plane,
  Home,
  Zap,
  Film,
  Activity,
  Tag,
  DollarSign,
  LucideIcon,
} from "lucide-react";

export interface MobileCategoryTheme {
  id: string;
  name: string;
  flatBadge: string;
  containerTint: string;
  iconColor: string;
  gradient: string;
  materialIcon: string;
  icon: LucideIcon;
  textColor: string;
}

export const MOBILE_CATEGORIES: Record<string, MobileCategoryTheme> = {
  food: {
    id: "food",
    name: "Food & Dining",
    flatBadge: "#005CBC",
    containerTint: "rgba(68, 143, 255, 0.18)",
    iconColor: "#ABC7FF",
    gradient: "linear-gradient(135deg, #005CBC, #002F66)",
    materialIcon: "restaurant",
    icon: Utensils,
    textColor: "#FFFFFF",
  },
  groceries: {
    id: "groceries",
    name: "Groceries",
    flatBadge: "#4FD48C",
    containerTint: "rgba(79, 212, 140, 0.18)",
    iconColor: "#4FD48C",
    gradient: "linear-gradient(135deg, #4FD48C, #2FA5D8)",
    materialIcon: "shopping_cart",
    icon: ShoppingCart,
    textColor: "#FFFFFF",
  },
  travel: {
    id: "travel",
    name: "Travel & Transport",
    flatBadge: "#799A5E",
    containerTint: "rgba(121, 154, 94, 0.20)",
    iconColor: "#AED18F",
    gradient: "linear-gradient(135deg, #799A5E, #1B3706)",
    materialIcon: "flight",
    icon: Plane,
    textColor: "#FFFFFF",
  },
  rent: {
    id: "rent",
    name: "Rent & Housing",
    flatBadge: "#C98A4A",
    containerTint: "rgba(201, 138, 74, 0.18)",
    iconColor: "#FFB4A5",
    gradient: "linear-gradient(135deg, #C98A4A, #8C5A2B)",
    materialIcon: "home",
    icon: Home,
    textColor: "#FFFFFF",
  },
  utilities: {
    id: "utilities",
    name: "Utilities & Bills",
    flatBadge: "#7C8898",
    containerTint: "rgba(124, 136, 152, 0.20)",
    iconColor: "#C1C6D7",
    gradient: "linear-gradient(135deg, #7C8898, #4A5563)",
    materialIcon: "bolt",
    icon: Zap,
    textColor: "#FFFFFF",
  },
  entertainment: {
    id: "entertainment",
    name: "Entertainment",
    flatBadge: "#B15FC0",
    containerTint: "rgba(177, 95, 192, 0.18)",
    iconColor: "#E2A9F0",
    gradient: "linear-gradient(135deg, #B15FC0, #6A4FA8)",
    materialIcon: "movie",
    icon: Film,
    textColor: "#FFFFFF",
  },
  shopping: {
    id: "shopping",
    name: "Shopping",
    flatBadge: "#E8B368",
    containerTint: "rgba(232, 179, 104, 0.18)",
    iconColor: "#FFD28A",
    gradient: "linear-gradient(135deg, #E8B368, #C67A3E)",
    materialIcon: "shopping_bag",
    icon: ShoppingBag,
    textColor: "#FFFFFF",
  },
  health: {
    id: "health",
    name: "Health & Fitness",
    flatBadge: "#802918",
    containerTint: "rgba(128, 41, 24, 0.22)",
    iconColor: "#FFB4A5",
    gradient: "linear-gradient(135deg, #802918, #611205)",
    materialIcon: "favorite",
    icon: Activity,
    textColor: "#FFFFFF",
  },
  income: {
    id: "income",
    name: "Income & Salary",
    flatBadge: "#AED18F",
    containerTint: "rgba(174, 209, 143, 0.20)",
    iconColor: "#AED18F",
    gradient: "linear-gradient(135deg, #AED18F, #1B3706)",
    materialIcon: "payments",
    icon: DollarSign,
    textColor: "#FFFFFF",
  },
  misc: {
    id: "misc",
    name: "Miscellaneous",
    flatBadge: "#7C8898",
    containerTint: "rgba(124, 136, 152, 0.18)",
    iconColor: "#C1C6D7",
    gradient: "linear-gradient(135deg, #7C8898, #4A5563)",
    materialIcon: "sell",
    icon: Tag,
    textColor: "#FFFFFF",
  },
};

/**
 * Returns the mobile category theme for any arbitrary category name.
 */
export function getMobileCategoryTheme(categoryName?: string): MobileCategoryTheme {
  if (!categoryName) return MOBILE_CATEGORIES.misc;
  const lower = categoryName.toLowerCase().trim();

  if (lower.includes("food") || lower.includes("dining") || lower.includes("restaurant") || lower.includes("cafe") || lower.includes("coffee") || lower.includes("swiggy") || lower.includes("zomato")) {
    return MOBILE_CATEGORIES.food;
  }
  if (lower.includes("groc") || lower.includes("market") || lower.includes("supermarket") || lower.includes("blinkit") || lower.includes("zepto") || lower.includes("instamart")) {
    return MOBILE_CATEGORIES.groceries;
  }
  if (lower.includes("travel") || lower.includes("transport") || lower.includes("flight") || lower.includes("uber") || lower.includes("ola") || lower.includes("taxi") || lower.includes("cab") || lower.includes("train") || lower.includes("hotel") || lower.includes("fuel") || lower.includes("petrol")) {
    return MOBILE_CATEGORIES.travel;
  }
  if (lower.includes("rent") || lower.includes("hous") || lower.includes("mortgage") || lower.includes("flat") || lower.includes("society")) {
    return MOBILE_CATEGORIES.rent;
  }
  if (lower.includes("util") || lower.includes("bill") || lower.includes("electric") || lower.includes("wifi") || lower.includes("phone") || lower.includes("recharge") || lower.includes("broadband") || lower.includes("water") || lower.includes("gas")) {
    return MOBILE_CATEGORIES.utilities;
  }
  if (lower.includes("entertain") || lower.includes("movie") || lower.includes("game") || lower.includes("stream") || lower.includes("netflix") || lower.includes("spotify") || lower.includes("subscrip")) {
    return MOBILE_CATEGORIES.entertainment;
  }
  if (lower.includes("health") || lower.includes("med") || lower.includes("doctor") || lower.includes("fit") || lower.includes("gym") || lower.includes("pharmacy") || lower.includes("hospital")) {
    return MOBILE_CATEGORIES.health;
  }
  if (lower.includes("income") || lower.includes("salary") || lower.includes("deposit") || lower.includes("wage") || lower.includes("interest") || lower.includes("dividend") || lower.includes("refund")) {
    return MOBILE_CATEGORIES.income;
  }
  if (lower.includes("shop") || lower.includes("cloth") || lower.includes("store") || lower.includes("retail") || lower.includes("amazon") || lower.includes("flipkart") || lower.includes("myntra") || lower.includes("shoes")) {
    return MOBILE_CATEGORIES.shopping;
  }

  return MOBILE_CATEGORIES.misc;
}
