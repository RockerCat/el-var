import { describe, it, expect } from "vitest";
import { isTournamentFinished } from "./matches";

function m(status: "scheduled" | "live" | "finished") {
  return { status };
}

describe("isTournamentFinished", () => {
  it("is false on an empty list (never close the tournament on a partial/failed fetch)", () => {
    expect(isTournamentFinished([])).toBe(false);
  });

  it("is false while any match is scheduled", () => {
    expect(isTournamentFinished([m("finished"), m("finished"), m("scheduled")])).toBe(false);
  });

  it("is false while any match is live", () => {
    expect(isTournamentFinished([m("finished"), m("live")])).toBe(false);
  });

  it("is false when only the Final looks finished but earlier fixtures aren't", () => {
    // Guards against declaring the tournament over just because the Final's
    // scoreline exists — every other real match must also be finished.
    expect(isTournamentFinished([m("scheduled"), m("finished")])).toBe(false);
  });

  it("is true only when every match is finished", () => {
    expect(isTournamentFinished([m("finished"), m("finished"), m("finished")])).toBe(true);
  });

  it("is true for a single finished match", () => {
    expect(isTournamentFinished([m("finished")])).toBe(true);
  });
});
