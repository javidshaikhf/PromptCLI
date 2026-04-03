import { describe, expect, it } from "vitest";
import { classifyPromptInput } from "../../src/lib/planner/classifyInput";

describe("prompt classification", () => {
  it("passes obvious shell commands through", () => {
    const result = classifyPromptInput("git status");
    expect(result.classification).toBe("shell");
  });

  it("treats english requests as natural language", () => {
    const result = classifyPromptInput("push it to github");
    expect(result.classification).toBe("natural_language");
  });

  it("treats simple greetings as natural language", () => {
    const result = classifyPromptInput("hi");
    expect(result.classification).toBe("natural_language");
  });

  it("marks short unclear inputs as ambiguous", () => {
    const result = classifyPromptInput("status");
    expect(result.classification).toBe("ambiguous");
  });

  it("supports explicit overrides", () => {
    expect(classifyPromptInput("!echo hello").classification).toBe("shell");
    expect(classifyPromptInput("?find all TODOs").classification).toBe(
      "natural_language"
    );
  });
});
