import { describe, expect, it } from "vitest";
import { canCustomerCancel, zonedToUtc } from "@/lib/time";
import { validateWeek, defaultWeek } from "@/features/business/hours";

describe("cancellation window", () => {
  const now = new Date("2026-11-01T10:00:00Z");
  it("allows cancelling more than 24h before", () => {
    expect(canCustomerCancel("2026-11-02T11:00:00Z", 24, now)).toBe(true);
  });
  it("blocks cancelling inside 24h", () => {
    expect(canCustomerCancel("2026-11-02T09:00:00Z", 24, now)).toBe(false);
  });
});

describe("timezone conversion", () => {
  it("09:00 in Rome in winter is 08:00 UTC", () => {
    expect(zonedToUtc("2026-11-10", "09:00", "Europe/Rome").toISOString()).toBe("2026-11-10T08:00:00.000Z");
  });
});

describe("weekly hours validation", () => {
  it("rejects closing before opening", () => {
    const w = defaultWeek();
    w[1].ranges = [{ start: "18:00", end: "09:00" }];
    expect(validateWeek(w)).toMatch(/Monday/);
  });
  it("rejects overlapping ranges", () => {
    const w = defaultWeek();
    w[2].ranges = [{ start: "09:00", end: "13:00" }, { start: "12:00", end: "18:00" }];
    expect(validateWeek(w)).toMatch(/overlap/);
  });
});
