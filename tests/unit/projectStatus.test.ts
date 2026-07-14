import { describe, it, expect } from "vitest";
import {
  canTransitionProject,
  allowedProjectTransitions,
  projectStatusLabel,
  requestStatusForProject,
} from "@/lib/domain/projectStatus";

describe("project status machine", () => {
  it("allows PLANNED → IN_PROGRESS → COMPLETED", () => {
    expect(canTransitionProject("PLANNED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionProject("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(allowedProjectTransitions("COMPLETED")).toEqual([]);
    expect(allowedProjectTransitions("CANCELLED")).toEqual([]);
  });

  it("rejects reviving a completed project", () => {
    expect(canTransitionProject("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("allows pausing and resuming", () => {
    expect(canTransitionProject("IN_PROGRESS", "ON_HOLD")).toBe(true);
    expect(canTransitionProject("ON_HOLD", "IN_PROGRESS")).toBe(true);
  });

  it("maps project statuses to the mirrored request status", () => {
    expect(requestStatusForProject("PLANNED")).toBe("PROJECT_SCHEDULED");
    expect(requestStatusForProject("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(requestStatusForProject("ON_HOLD")).toBe("ON_HOLD");
    expect(requestStatusForProject("COMPLETED")).toBe("COMPLETED");
    expect(requestStatusForProject("CANCELLED")).toBe("CANCELLED");
  });

  it("humanizes status labels", () => {
    expect(projectStatusLabel("IN_PROGRESS")).toBe("In Progress");
    expect(projectStatusLabel("ON_HOLD")).toBe("On Hold");
  });
});
