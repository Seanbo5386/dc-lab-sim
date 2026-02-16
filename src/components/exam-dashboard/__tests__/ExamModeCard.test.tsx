import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookOpen } from "lucide-react";

vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  const stub = (props: Record<string, unknown>) => <svg {...props} />;
  return { ...actual, BookOpen: stub, Clock: stub, HelpCircle: stub };
});

import { ExamModeCard } from "../ExamModeCard";
import type { ExamModeEntry } from "../../../data/examModeRegistry";

const baseMode: ExamModeEntry = {
  id: "test-mode",
  title: "Test Mode",
  subtitle: "Test Sub",
  description: "A test description",
  icon: BookOpen,
  duration: "30 min",
  questionCount: "20 questions",
  launchKey: "exam",
  examMode: "full-practice",
};

describe("ExamModeCard", () => {
  it("renders title, description, duration, question count", () => {
    render(<ExamModeCard mode={baseMode} onLaunch={vi.fn()} />);
    expect(screen.getByText("Test Mode")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("20 questions")).toBeInTheDocument();
  });

  it("calls onLaunch on button click", () => {
    const onLaunch = vi.fn();
    render(<ExamModeCard mode={baseMode} onLaunch={onLaunch} />);
    fireEvent.click(screen.getByRole("button", { name: /start test mode/i }));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("shows badge when provided", () => {
    const modeWithBadge = { ...baseMode, badge: "NEW" };
    render(<ExamModeCard mode={modeWithBadge} onLaunch={vi.fn()} />);
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("does not show badge when not provided", () => {
    render(<ExamModeCard mode={baseMode} onLaunch={vi.fn()} />);
    expect(screen.queryByText("RECOMMENDED")).not.toBeInTheDocument();
  });

  it("shows last score when provided", () => {
    render(
      <ExamModeCard
        mode={baseMode}
        onLaunch={vi.fn()}
        lastScore={85}
        lastDate="Feb 15"
      />,
    );
    expect(screen.getByText(/Last: 85%/)).toBeInTheDocument();
    expect(screen.getByText(/Feb 15/)).toBeInTheDocument();
  });
});
