"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  BookOpenIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

interface OnboardingStepperProps {
  onComplete: (newProfile: any) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, title: "Name" },
  { id: 2, title: "Year Group" },
  { id: 3, title: "Subjects" },
  { id: 4, title: "Exam Board" },
];

export function OnboardingStepper({ onComplete, onCancel }: OnboardingStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [schoolYear, setSchoolYear] = useState<"8" | "9">("8");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    "GCSE Maths",
  ]);
  const [examBoard, setExamBoard] = useState<string>("Unspecified");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStep = () => {
    if (currentStep === 1 && !name.trim()) return;
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          schoolYear,
          selectedSubjects,
          examBoard,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create student profile");
      }

      const newProfile = await response.json();
      onComplete(newProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-pop">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <XIcon className="size-5" />
          </button>
        )}

        {/* Stepper Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    currentStep >= step.id
                      ? "bg-brand-coral text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < 4 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      currentStep > step.id ? "bg-brand-coral" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step {currentStep} of 4: {STEPS[currentStep - 1].title}
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {/* Steps Content */}
        <div className="min-h-[220px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    What is your child's name?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    SARA will customize the UK curriculum lessons specifically for them.
                  </p>
                </div>
                <div className="pt-2">
                  <Input
                    type="text"
                    placeholder="e.g. Charlie"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    className="h-12 text-lg border-2 focus-visible:ring-brand-coral focus-visible:border-brand-coral"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    Which school year is {name} in?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    This ensures SARA matches the Year 8 or Year 9 standard GCSE pathways.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => setSchoolYear("8")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                      schoolYear === "8"
                        ? "border-brand-coral bg-brand-coral/5 text-brand-coral"
                        : "border-border bg-card hover:border-brand-coral/40"
                    }`}
                  >
                    <span className="text-4xl mb-2">🎒</span>
                    <span className="font-bold text-lg">Year 8</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Key Stage 3 Essentials
                    </span>
                  </button>

                  <button
                    onClick={() => setSchoolYear("9")}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${
                      schoolYear === "9"
                        ? "border-brand-coral bg-brand-coral/5 text-brand-coral"
                        : "border-border bg-card hover:border-brand-coral/40"
                    }`}
                  >
                    <span className="text-4xl mb-2">🚀</span>
                    <span className="font-bold text-lg">Year 9</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      GCSE Foundations
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    Select GCSE subjects
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Which subjects should SARA teach {name}?
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    { id: "GCSE Maths", label: "GCSE Maths", icon: "📐" },
                    { id: "GCSE Science", label: "GCSE Science", icon: "🧪" },
                  ].map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => handleSubjectToggle(subject.id)}
                        className={`flex items-center w-full p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-brand-coral bg-brand-coral/5 text-brand-coral"
                            : "border-border bg-card hover:border-brand-coral/40"
                        }`}
                      >
                        <span className="text-2xl mr-4">{subject.icon}</span>
                        <div className="flex-1">
                          <span className="font-bold">{subject.label}</span>
                        </div>
                        <div
                          className={`size-5 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? "border-brand-coral bg-brand-coral text-white"
                              : "border-muted-foreground"
                          }`}
                        >
                          {isSelected && <CheckIcon className="size-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    Which GCSE Exam Board?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    This aligns challenge questions with real UK exam patterns.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: "AQA", label: "AQA Exam Board" },
                    { id: "Edexcel", label: "Edexcel Board" },
                    { id: "OCR", label: "OCR Exam Board" },
                    { id: "Unspecified", label: "Unspecified / General" },
                  ].map((board) => {
                    const isSelected = examBoard === board.id;
                    return (
                      <button
                        key={board.id}
                        onClick={() => setExamBoard(board.id)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          isSelected
                            ? "border-brand-coral bg-brand-coral/5 text-brand-coral"
                            : "border-border bg-card hover:border-brand-coral/40"
                        }`}
                      >
                        <span className="font-bold block text-sm">{board.id}</span>
                        <span className="text-xs text-muted-foreground">
                          {board.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="h-10 px-4"
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            Back
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={currentStep === 1 && !name.trim()}
              className="h-10 px-4 bg-brand-coral hover:bg-brand-coral/80 text-white"
            >
              Continue
              <ArrowRightIcon className="size-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-10 px-4 bg-brand-coral hover:bg-brand-coral/80 text-white min-w-[100px]"
            >
              {isSubmitting ? (
                <Spinner className="size-4 text-white" />
              ) : (
                <>
                  Finish
                  <SparklesIcon className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
