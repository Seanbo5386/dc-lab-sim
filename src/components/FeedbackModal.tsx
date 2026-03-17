import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Send, Loader2 } from "lucide-react";
import { generateClient } from "aws-amplify/data";
import { useFocusTrap } from "../hooks/useFocusTrap";

const client = generateClient<any>();

type Category = "general" | "bug" | "success";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "success", label: "Success Story" },
];

const PLACEHOLDERS: Record<Category, string> = {
  general: "What could we do better?",
  bug: "Describe what happened and what you expected",
  success:
    "Did this help you pass the NCP-AII? We'd love to hear about it!",
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
}

export function FeedbackModal({
  isOpen,
  onClose,
  isLoggedIn,
}: FeedbackModalProps) {
  const [category, setCategory] = useState<Category>("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, { isActive: isOpen, onEscape: onClose });

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory("general");
      setMessage("");
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    try {
      await client.models.Feedback.create({
        category,
        message: message.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      // Silently fail — user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      data-testid="feedback-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2 text-nvidia-green font-semibold">
            <MessageSquare className="w-5 h-5" />
            Send Feedback
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Close feedback"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Auth gate */}
          {!isLoggedIn && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-300">
              <p>
                Please sign in to submit feedback — accounts help us
                prevent spam and follow up if needed.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-3 py-1.5 bg-nvidia-green text-black rounded-lg text-sm font-medium hover:bg-nvidia-darkgreen transition-colors"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                disabled={!isLoggedIn}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === value
                    ? "bg-nvidia-green text-black"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={PLACEHOLDERS[category]}
            disabled={!isLoggedIn}
            rows={4}
            maxLength={2000}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-nvidia-green resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Submit / Success */}
          {submitted ? (
            <div className="text-center text-nvidia-green text-sm font-medium py-2">
              Thank you for your feedback!
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting || !isLoggedIn}
              aria-label="Submit feedback"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-nvidia-green text-black rounded-lg font-medium text-sm hover:bg-nvidia-darkgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
