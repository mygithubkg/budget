import { MARKET_TICKERS } from "@/lib/markets/yahoo";

describe("Markets Data Configuration and Tickers", () => {
  it("should define valid tickers for all 3 key indices", () => {
    expect(MARKET_TICKERS.indices.nifty50.symbol).toBe("^NSEI");
    expect(MARKET_TICKERS.indices.sensex.symbol).toBe("^BSESN");
    expect(MARKET_TICKERS.indices.nasdaq.symbol).toBe("^IXIC");
  });

  it("should define valid tickers for all 3 key commodities", () => {
    expect(MARKET_TICKERS.commodities.gold.symbol).toBe("GC=F");
    expect(MARKET_TICKERS.commodities.silver.symbol).toBe("SI=F");
    expect(MARKET_TICKERS.commodities.crudeOil.symbol).toBe("CL=F");
  });

  it("should have appropriate units and currency metadata", () => {
    expect(MARKET_TICKERS.indices.nifty50.currency).toBe("INR");
    expect(MARKET_TICKERS.indices.nasdaq.currency).toBe("USD");
    expect(MARKET_TICKERS.commodities.gold.unit).toBe("USD / oz");
    expect(MARKET_TICKERS.commodities.crudeOil.unit).toBe("USD / bbl");
  });
});
