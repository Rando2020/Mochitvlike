import { describe, expect, it } from "vitest";
import { CRAYVO } from "../crayvo";

describe("Crayvo brand constants", () => {
  it("uses a single public product name across web and install metadata", () => {
    expect(CRAYVO.name).toBe("Crayvo");
    expect(CRAYVO.fullName).toContain(CRAYVO.name);
    expect(CRAYVO.tagline).toBe("Stories become worlds.");
  });
});
