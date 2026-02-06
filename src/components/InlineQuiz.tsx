import { useState } from "react";
import type { NarrativeQuiz } from "../types/scenarios";
import { Check, X } from "lucide-react";

interface InlineQuizProps {
  quiz: NarrativeQuiz;
  onComplete: (correct: boolean) => void;
}

export function InlineQuiz({ quiz, onComplete }: InlineQuizProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === quiz.correctIndex;

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedIndex(index);
    onComplete(index === quiz.correctIndex);
  };

  return (
    <div className="bg-indigo-900/30 border border-indigo-500/40 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-indigo-300 mb-3">
        KNOWLEDGE CHECK
      </h4>
      <p className="text-white font-medium mb-4">{quiz.question}</p>

      <div className="space-y-2">
        {quiz.options.map((option, idx) => {
          const isSelected = selectedIndex === idx;
          const isCorrectOption = idx === quiz.correctIndex;

          let className =
            "w-full text-left p-3 rounded-lg text-sm transition-colors ";
          if (!isAnswered) {
            className +=
              "bg-gray-800 hover:bg-gray-700 text-gray-200 cursor-pointer";
          } else if (isSelected && isCorrect) {
            className +=
              "bg-green-900/50 border border-green-500 text-green-200";
          } else if (isSelected && !isCorrect) {
            className += "bg-red-900/50 border border-red-500 text-red-200";
          } else if (isCorrectOption) {
            className +=
              "bg-green-900/30 border border-green-500/50 text-green-300";
          } else {
            className += "bg-gray-800/50 text-gray-500";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={className}
              disabled={isAnswered}
            >
              <span className="flex items-center gap-2">
                {isAnswered && isCorrectOption && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isAnswered && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? "bg-green-900/20 text-green-200" : "bg-amber-900/20 text-amber-200"}`}
        >
          <p className="font-semibold mb-1">
            {isCorrect ? "Correct!" : "Not quite."}
          </p>
          <p>{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
