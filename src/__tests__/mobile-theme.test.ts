import { getMobileCategoryTheme, MOBILE_CATEGORIES } from "@/lib/mobile-theme";

describe("Mobile UI v4 Material Design 3 Theme & Category Mapping", () => {
  it("should return food category theme for food and dining keywords", () => {
    const theme = getMobileCategoryTheme("Food & Dining");
    expect(theme.id).toBe("food");
    expect(theme.flatBadge).toBe("#005CBC");
    expect(theme.gradient).toContain("#005CBC");
    expect(theme.materialIcon).toBe("restaurant");
  });

  it("should return travel category theme for flight, transport, uber", () => {
    const flightTheme = getMobileCategoryTheme("Flight to Berlin");
    expect(flightTheme.id).toBe("travel");
    expect(flightTheme.flatBadge).toBe("#799A5E");
    expect(flightTheme.materialIcon).toBe("flight");

    const uberTheme = getMobileCategoryTheme("Uber Ride");
    expect(uberTheme.id).toBe("travel");
  });

  it("should return groceries category theme for groceries and supermarket", () => {
    const theme = getMobileCategoryTheme("Supermarket Groceries");
    expect(theme.id).toBe("groceries");
    expect(theme.flatBadge).toBe("#4FD48C");
    expect(theme.materialIcon).toBe("shopping_cart");
  });

  it("should fallback gracefully to misc theme for unknown categories", () => {
    const theme = getMobileCategoryTheme("Some Custom Unmatched Thing");
    expect(theme.id).toBe("misc");
    expect(theme.flatBadge).toBe("#7C8898");
    expect(theme.materialIcon).toBe("sell");
  });
});
