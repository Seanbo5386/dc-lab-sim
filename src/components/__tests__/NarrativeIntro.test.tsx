import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NarrativeIntro } from "../NarrativeIntro";

const mockNarrative = {
  hook: "A new cluster has arrived at midnight.",
  setting: "You're the lead engineer on call.",
  resolution: "Successfully bring the cluster online.",
};

describe("NarrativeIntro", () => {
  it("should render the story hook", () => {
    render(
      <NarrativeIntro
        narrative={mockNarrative}
        title="The Midnight Deployment"
        onBegin={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/a new cluster has arrived at midnight/i),
    ).toBeInTheDocument();
  });

  it("should render the setting", () => {
    render(
      <NarrativeIntro
        narrative={mockNarrative}
        title="The Midnight Deployment"
        onBegin={vi.fn()}
      />,
    );
    expect(screen.getByText(/lead engineer/i)).toBeInTheDocument();
  });

  it("should render Begin Mission button", () => {
    render(
      <NarrativeIntro
        narrative={mockNarrative}
        title="The Midnight Deployment"
        onBegin={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /begin mission/i }),
    ).toBeInTheDocument();
  });

  it("should call onBegin when button is clicked", () => {
    const onBegin = vi.fn();
    render(
      <NarrativeIntro
        narrative={mockNarrative}
        title="The Midnight Deployment"
        onBegin={onBegin}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /begin mission/i }));
    expect(onBegin).toHaveBeenCalledOnce();
  });
});
