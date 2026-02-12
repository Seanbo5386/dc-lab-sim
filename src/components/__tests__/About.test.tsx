import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock lucide-react icons (Proxy causes vitest to hang)
vi.mock("lucide-react", () => {
  const mk = (n: string) => {
    const C = () => null;
    C.displayName = n;
    return C;
  };
  return {
    Rocket: mk("Rocket"),
    Github: mk("Github"),
    Bug: mk("Bug"),
    GitPullRequest: mk("GitPullRequest"),
    Tag: mk("Tag"),
    ExternalLink: mk("ExternalLink"),
    Sparkles: mk("Sparkles"),
    Linkedin: mk("Linkedin"),
    Shield: mk("Shield"),
  };
});

import { About } from "../About";

describe("About", () => {
  it("renders without crashing", () => {
    render(<About />);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("shows the Motivation section", () => {
    render(<About />);
    expect(screen.getByText("Motivation")).toBeInTheDocument();
  });

  it("shows the Contribute & Feedback section", () => {
    render(<About />);
    expect(screen.getByText("Contribute & Feedback")).toBeInTheDocument();
  });

  it("shows a GitHub link with correct href and target", () => {
    render(<About />);
    const link = screen.getByTestId("github-link");
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/Seanbo5386/NVIDIA-Certification-Simulator",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("displays changelog versions v0.9.2 and v0.1.0", () => {
    render(<About />);
    expect(screen.getByText("v0.9.2")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
  });

  it("marks v0.9.2 as the current version", () => {
    render(<About />);
    const current = screen.getByTestId("current-version");
    expect(current).toHaveTextContent("v0.9.2");
    expect(screen.getByText("current")).toBeInTheDocument();
  });
});
