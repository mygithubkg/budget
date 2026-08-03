import { SUPPORTED_CURRENCIES } from "./constants";

export function getCurrencySymbol(currencyCode: string = "INR"): string {
  const match = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === currencyCode.toUpperCase()
  );
  return match?.symbol || "₹";
}

export function formatCurrency(
  amount: number,
  currencyCode: string = "INR",
  showDecimals: boolean = true
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formattedNumber = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);

  if (isNegative) {
    return `-${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
}
