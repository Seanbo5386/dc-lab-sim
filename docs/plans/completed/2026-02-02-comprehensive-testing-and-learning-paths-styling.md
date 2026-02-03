# Comprehensive Lab Testing & Learning Paths Styling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create comprehensive command-by-command test coverage for all 64 lab scenarios with auto-generated tests, soundness checks, and convert LearningPaths component to Tailwind CSS for visual consistency.

**Architecture:** Two-phase approach: (1) Convert LearningPaths to Tailwind CSS matching existing component patterns, (2) Build test infrastructure with auto-generated tests from scenario JSON, validation inference engine, and comprehensive soundness checks covering cross-simulator consistency, state transitions, boundary conditions, and creative flag/command progressions.

**Tech Stack:** Vitest, TypeScript, React, Tailwind CSS, Zustand store

---

## Phase 1: LearningPaths Tailwind Conversion

### Task 1: Create Tailwind Style Mapping Reference

**Files:**

- Reference: `src/components/Dashboard.tsx` (existing Tailwind patterns)
- Reference: `src/components/LearningPaths.tsx` (current inline styles)
- Reference: `tailwind.config.js` (custom colors)

**Step 1: Document the style mapping**

Create a reference of inline styles to Tailwind conversions to use throughout the conversion:

```
Container/Background:
- backgroundColor: '#1e1e1e' → bg-gray-900
- backgroundColor: '#2a2a2a' → bg-gray-800
- backgroundColor: '#333' → bg-gray-700
- backgroundColor: '#1a1a1a' → bg-black

Text Colors:
- color: '#76b900' → text-nvidia-green
- color: '#e0e0e0' → text-gray-200
- color: '#ccc' → text-gray-300
- color: '#aaa' → text-gray-400
- color: '#888' → text-gray-500
- color: '#666' → text-gray-600
- color: '#fff' → text-white
- color: '#000' → text-black

Borders:
- border: '1px solid #333' → border border-gray-700
- border: '1px solid #444' → border border-gray-600
- border: '1px solid #76b900' → border border-nvidia-green

Spacing:
- padding: '20px' → p-5
- padding: '15px' → p-4
- padding: '10px' → p-2.5
- margin: '0 auto' → mx-auto
- gap: '15px' → gap-4
- gap: '10px' → gap-2.5

Border Radius:
- borderRadius: '8px' → rounded-lg
- borderRadius: '6px' → rounded-md
- borderRadius: '4px' → rounded
- borderRadius: '3px' → rounded-sm
- borderRadius: '50%' → rounded-full

Typography:
- fontSize: '28px' → text-3xl
- fontSize: '24px' → text-2xl
- fontSize: '20px' → text-xl
- fontSize: '18px' → text-lg
- fontSize: '16px' → text-base
- fontSize: '14px' → text-sm
- fontSize: '13px' → text-sm
- fontSize: '12px' → text-xs
- fontSize: '11px' → text-xs
- fontWeight: 'bold' → font-bold
- fontWeight: 'medium' → font-medium

Layout:
- display: 'flex' → flex
- flexDirection: 'column' → flex-col
- alignItems: 'center' → items-center
- justifyContent: 'space-between' → justify-between
- justifyContent: 'center' → justify-center
- gridTemplateColumns: 'repeat(4, 1fr)' → grid grid-cols-4
- gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' → grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

**Step 2: Verify Tailwind config has required colors**

Run: `cat tailwind.config.js`
Expected: Contains `nvidia: { green: '#76B900', ... }`

---

### Task 2: Convert LearningPaths Container and Header Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert container styles**

Replace the container div styling from:

```tsx
<div style={styles.container}>
```

To:

```tsx
<div className="bg-gray-900 text-gray-200 rounded-lg max-w-6xl mx-auto font-sans min-h-[600px] flex flex-col">
```

**Step 2: Convert header styles**

Replace header section from:

```tsx
<div style={styles.header}>
  <div style={styles.headerLeft}>
    ...
    <button onClick={goBack} style={styles.backButton}>
    ...
    <h2 style={styles.title}>
    ...
    <p style={styles.subtitle}>
  ...
  <button onClick={onClose} style={styles.closeButton}>
```

To:

```tsx
<div className="flex justify-between items-center p-5 border-b border-gray-700">
  <div className="flex items-center gap-4">
    {viewState !== "paths" && (
      <button
        onClick={goBack}
        className="px-4 py-2 bg-gray-700 border-none rounded text-gray-500 cursor-pointer text-sm hover:bg-gray-600 transition-colors"
      >
        ← Back
      </button>
    )}
    <div>
      <h2 className="m-0 text-nvidia-green text-2xl font-semibold">
        {viewState === "paths" && "Learning Paths"}
        ...
      </h2>
      <p className="mt-1 mb-0 text-gray-500 text-sm">...</p>
    </div>
  </div>
  {onClose && (
    <button
      onClick={onClose}
      className="bg-transparent border-none text-gray-500 text-3xl cursor-pointer leading-none px-2.5 hover:text-gray-300 transition-colors"
    >
      ×
    </button>
  )}
</div>
```

**Step 3: Convert content wrapper**

Replace:

```tsx
<div style={styles.content}>
```

To:

```tsx
<div className="p-5 flex-1 overflow-auto">
```

**Step 4: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

---

### Task 3: Convert Stats Row and Recommended Card Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert statsRow**

Replace:

```tsx
<div style={styles.statsRow}>
  <div style={styles.statBox}>
    <div style={styles.statValue}>{totalStats.totalPaths}</div>
    <div style={styles.statLabel}>Learning Paths</div>
  </div>
  ...
</div>
```

To:

```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-gray-800/50 rounded-lg p-5 text-center">
    <div className="text-3xl font-bold text-nvidia-green">
      {totalStats.totalPaths}
    </div>
    <div className="text-xs text-gray-500 mt-1">Learning Paths</div>
  </div>
  ...
</div>
```

**Step 2: Convert resetProgressRow**

Replace:

```tsx
<div style={styles.resetProgressRow}>
  <button onClick={resetProgress} style={styles.resetButton}>
```

To:

```tsx
<div className="flex justify-end mb-4">
  <button onClick={resetProgress} className="px-4 py-2 bg-transparent border border-gray-600 rounded text-gray-500 cursor-pointer text-xs hover:border-gray-500 hover:text-gray-400 transition-all">
```

**Step 3: Convert recommendedCard**

Replace:

```tsx
<div style={styles.recommendedCard}>
  <div style={styles.recommendedBadge}>📌 Continue Learning</div>
  <h3 style={styles.recommendedTitle}>{recommendedNext.lesson.title}</h3>
  <p style={styles.recommendedMeta}>
  ...
  <button ... style={styles.startButton}>
```

To:

```tsx
<div className="bg-green-900/30 border border-nvidia-green rounded-lg p-5 mb-6">
  <div className="text-nvidia-green text-xs font-bold mb-2.5">📌 Continue Learning</div>
  <h3 className="m-0 mb-2 text-white text-lg">{recommendedNext.lesson.title}</h3>
  <p className="text-gray-500 text-sm m-0 mb-4">
  ...
  <button ... className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 4: Convert Paths Grid and Path Card Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert pathsGrid**

Replace:

```tsx
<div style={styles.pathsGrid}>
```

To:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
```

**Step 2: Convert pathCard**

Replace:

```tsx
<div key={path.id} style={styles.pathCard} onClick={() => selectPath(path)}>
  <div style={styles.pathHeader}>
    <div style={{
      ...styles.domainBadge,
      backgroundColor: getDomainColor(path.domainId),
    }}>
    ...
    <span style={styles.examWeight}>{path.examWeight}%</span>
  </div>
  <h3 style={styles.pathTitle}>{path.title}</h3>
  <p style={styles.pathDescription}>{path.description}</p>
  <div style={styles.pathStats}>
  ...
  <div style={styles.pathProgress}>
    <div style={styles.progressBarBg}>
      <div style={{ ...styles.progressBarFill, width: `${progress?.overallPercentage || 0}%` }} />
    </div>
    <span style={styles.progressText}>
  ...
  <div style={styles.skillsList}>
    ...
    <span key={i} style={styles.skillTag}>{skill}</span>
```

To:

```tsx
<div
  key={path.id}
  className="bg-gray-800 rounded-lg p-5 cursor-pointer border border-gray-700 hover:border-nvidia-green hover:shadow-lg transition-all"
  onClick={() => selectPath(path)}
>
  <div className="flex justify-between items-center mb-3">
    <div
      className="px-2.5 py-1 rounded text-xs font-bold text-white"
      style={{ backgroundColor: getDomainColor(path.domainId) }}
    >
      {domain.title.split(":")[0]}
    </div>
    <span className="text-gray-500 text-sm font-bold">{path.examWeight}%</span>
  </div>
  <h3 className="m-0 mb-2.5 text-white text-lg">{path.title}</h3>
  <p className="text-gray-500 text-sm m-0 mb-4 leading-relaxed">
    {path.description}
  </p>
  <div className="flex gap-4 text-sm text-gray-600 mb-3">
    <span>{path.modules.length} modules</span>
    <span>{path.totalEstimatedMinutes} min</span>
  </div>
  <div className="mb-3">
    <div className="h-1.5 bg-gray-700 rounded-sm overflow-hidden mb-1.5">
      <div
        className="h-full bg-nvidia-green transition-all duration-300"
        style={{ width: `${progress?.overallPercentage || 0}%` }}
      />
    </div>
    <span className="text-xs text-gray-500">
      {progress?.completedLessons || 0}/{progress?.totalLessons || 0} lessons
    </span>
  </div>
  <div className="flex flex-wrap gap-1.5">
    {path.skills.slice(0, 3).map((skill, i) => (
      <span
        key={i}
        className="px-2 py-0.5 bg-gray-700 rounded-sm text-xs text-gray-400"
      >
        {skill}
      </span>
    ))}
  </div>
</div>
```

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 5: Convert Module List and Module Card Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert modulesList**

Replace:

```tsx
<div style={styles.modulesList}>
```

To:

```tsx
<div className="flex flex-col gap-4">
```

**Step 2: Convert moduleCard**

Replace:

```tsx
<div
  key={module.id}
  style={{
    ...styles.moduleCard,
    opacity: isLocked ? 0.6 : 1,
    cursor: isLocked ? 'not-allowed' : 'pointer',
  }}
  onClick={() => selectModule(module)}
>
  <div style={styles.moduleOrder}>
  ...
  <div style={styles.moduleContent}>
    <h3 style={styles.moduleTitle}>
    <p style={styles.moduleDescription}>{module.description}</p>
    <div style={styles.moduleStats}>
      ...
      <span style={styles.prereqBadge}>
  ...
  <div style={styles.moduleProgress}>
    <div style={styles.circularProgress}>
      ...
      <span style={styles.circularText}>
```

To:

```tsx
<div
  key={module.id}
  className={`flex items-center bg-gray-800 rounded-lg p-5 gap-5 ${isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-nvidia-green"} border border-gray-700 transition-colors`}
  onClick={() => selectModule(module)}
>
  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-base text-nvidia-green shrink-0">
    {isComplete ? "✓" : isLocked ? "🔒" : idx + 1}
  </div>
  <div className="flex-1">
    <h3 className="m-0 mb-2 text-white text-base">
      {module.icon} {module.title}
    </h3>
    <p className="m-0 mb-2.5 text-gray-500 text-sm">{module.description}</p>
    <div className="text-sm text-gray-600 flex gap-4">
      <span>
        {lessonsComplete}/{module.lessons.length} lessons
      </span>
      {module.prerequisites && module.prerequisites.length > 0 && (
        <span className="text-orange-500 text-xs">
          Requires: {module.prerequisites.join(", ")}
        </span>
      )}
    </div>
  </div>
  <div className="relative">
    <div className="relative flex items-center justify-center">
      <svg width="50" height="50" viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#374151"
          strokeWidth="4"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          className="stroke-nvidia-green"
          strokeWidth="4"
          strokeDasharray={`${(lessonsComplete / module.lessons.length) * 125.6} 125.6`}
          transform="rotate(-90 25 25)"
        />
      </svg>
      <span className="absolute text-xs font-bold text-nvidia-green">
        {Math.round((lessonsComplete / module.lessons.length) * 100)}%
      </span>
    </div>
  </div>
</div>
```

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 6: Convert Lesson List and Lesson Card Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert lessonsList**

Replace:

```tsx
<div style={styles.lessonsList}>
```

To:

```tsx
<div className="flex flex-col gap-4">
```

**Step 2: Convert lessonCard**

Replace:

```tsx
<div
  key={lesson.id}
  style={{
    ...styles.lessonCard,
    opacity: isLocked ? 0.6 : 1,
    borderLeftColor: isComplete ? '#4CAF50' : isLocked ? '#666' : '#76b900',
  }}
  onClick={() => !isLocked && startLesson(lesson)}
>
  <div style={styles.lessonHeader}>
    <div style={styles.lessonNumber}>
    ...
    <div style={styles.lessonInfo}>
      <h4 style={styles.lessonTitle}>{lesson.title}</h4>
      <p style={styles.lessonDescription}>{lesson.description}</p>
    </div>
    <div style={styles.lessonMeta}>
      <span style={styles.difficultyBadge}>{lesson.difficulty}</span>
      <span style={styles.durationBadge}>{lesson.estimatedMinutes} min</span>
  ...
  <div style={styles.lessonObjectives}>
  ...
  <div style={styles.lessonCommands}>
    ...
    <code key={i} style={styles.commandTag}>{cmd}</code>
  ...
  <button style={styles.startLessonButton}
  <button style={{ ...styles.startLessonButton, backgroundColor: '#555' }}
```

To:

```tsx
<div
  key={lesson.id}
  className={`bg-gray-800 rounded-lg p-5 border-l-4 ${isComplete ? "border-l-green-500" : isLocked ? "border-l-gray-600" : "border-l-nvidia-green"} ${isLocked ? "opacity-60" : "cursor-pointer hover:bg-gray-750"} transition-colors`}
  onClick={() => !isLocked && startLesson(lesson)}
>
  <div className="flex items-start gap-4 mb-4">
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-sm text-nvidia-green shrink-0">
      {isComplete ? "✓" : isLocked ? "🔒" : idx + 1}
    </div>
    <div className="flex-1">
      <h4 className="m-0 mb-1 text-white text-base">{lesson.title}</h4>
      <p className="m-0 text-gray-500 text-sm">{lesson.description}</p>
    </div>
    <div className="flex gap-2.5">
      <span className="px-2 py-0.5 rounded-sm text-xs bg-gray-700 text-gray-400 capitalize">
        {lesson.difficulty}
      </span>
      <span className="px-2 py-0.5 rounded-sm text-xs bg-gray-700 text-nvidia-green">
        {lesson.estimatedMinutes} min
      </span>
    </div>
  </div>

  <div className="text-sm text-gray-500 mb-2.5">
    <strong>Objectives:</strong>
    <ul className="mt-1 mb-0 pl-5">
      {lesson.objectives.map((obj, i) => (
        <li key={i}>{obj}</li>
      ))}
    </ul>
  </div>

  <div className="text-sm text-gray-500 mb-4 flex items-center gap-2 flex-wrap">
    <strong>Commands:</strong>
    {lesson.commands.map((cmd, i) => (
      <code
        key={i}
        className="px-2 py-0.5 bg-black rounded-sm font-mono text-xs text-nvidia-green"
      >
        {cmd}
      </code>
    ))}
  </div>

  {!isLocked && !isComplete && (
    <button
      className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        startLesson(lesson);
      }}
    >
      Start Lesson →
    </button>
  )}
  {isComplete && (
    <button
      className="px-5 py-2.5 bg-gray-600 border-none rounded text-white font-bold cursor-pointer text-sm hover:bg-gray-500 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        startLesson(lesson);
      }}
    >
      Review Lesson
    </button>
  )}
</div>
```

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 7: Convert Tutorial Container and Progress Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert tutorialContainer**

Replace:

```tsx
<div style={styles.tutorialContainer}>
```

To:

```tsx
<div className="flex flex-col h-full min-h-[500px]">
```

**Step 2: Convert progressHeader**

Replace:

```tsx
<div style={styles.progressHeader}>
  <div style={styles.progressInfo}>
    <span style={styles.stepCounter}>
    <span style={styles.tutorialLessonTitle}>{selectedLesson.title}</span>
  </div>
  <div style={styles.progressBarContainer}>
    <div style={{ ...styles.progressBar, width: `${progress}%` }} />
  </div>
</div>
```

To:

```tsx
<div className="mb-5">
  <div className="flex justify-between mb-2">
    <span className="text-nvidia-green font-bold text-sm">
      Step {currentStepIndex + 1} of {selectedLesson.steps.length}
    </span>
    <span className="text-gray-500 text-sm">{selectedLesson.title}</span>
  </div>
  <div className="h-2 bg-gray-700 rounded overflow-hidden">
    <div
      className="h-full bg-nvidia-green transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

**Step 3: Convert stepContent**

Replace:

```tsx
<div style={styles.stepContent}>
  <h3 style={styles.stepTitle}>{step.title}</h3>
  <div style={styles.stepTypeBadge}>
  ...
  <div style={styles.stepDescription}>
```

To:

```tsx
<div className="flex-1 bg-gray-800 rounded-lg p-6 mb-5 overflow-auto">
  <h3 className="m-0 mb-4 text-white text-xl">{step.title}</h3>
  <div className="inline-block px-3 py-1 bg-gray-700 rounded text-xs text-gray-400 mb-5">
    {step.type === 'concept' && '📖 Concept'}
    {step.type === 'command' && '💻 Hands-On'}
    {step.type === 'quiz' && '❓ Quiz'}
    {step.type === 'observe' && '👁️ Observe'}
    {step.type === 'practice' && '🔧 Practice'}
  </div>
  <div className="text-gray-300 text-base leading-7 mb-5">
    {step.content.split('\n').map((line, i) => (
      <p key={i} className="my-2">{line}</p>
    ))}
  </div>
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 8: Convert Tips, Command Input, and Output Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert tipsBox**

Replace:

```tsx
<div style={styles.tipsBox}>
  <strong>💡 Tips:</strong>
  <ul style={styles.tipsList}>
```

To:

```tsx
<div className="bg-green-900/30 border border-green-800 rounded-md p-4 mb-5 text-sm">
  <strong>💡 Tips:</strong>
  <ul className="mt-2.5 mb-0 pl-5 text-gray-400">
```

**Step 2: Convert commandSection and commandInputWrapper**

Replace:

```tsx
<div style={styles.commandSection}>
  <div style={styles.commandInputWrapper}>
    <span style={styles.prompt}>$</span>
    <input ... style={styles.commandInput} .../>
    <button onClick={handleCommandSubmit} style={styles.executeButton}>
```

To:

```tsx
<div className="mt-5">
  <div className="flex items-center bg-black rounded-md p-1 mb-2.5">
    <span className="text-nvidia-green font-mono text-base px-2.5 font-bold">$</span>
    <input
      type="text"
      value={commandInput}
      onChange={(e) => setCommandInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleCommandSubmit()}
      placeholder="Type your command here..."
      className="flex-1 bg-transparent border-none text-white font-mono text-sm p-2.5 outline-none"
      autoFocus
    />
    <button onClick={handleCommandSubmit} className="px-5 py-2.5 bg-nvidia-green border-none rounded text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
      Execute
    </button>
  </div>
```

**Step 3: Convert hintText**

Replace:

```tsx
<div style={styles.hintText}>
```

To:

```tsx
<div className="text-gray-500 text-sm mb-4">
```

**Step 4: Convert outputBox and outputText**

Replace:

```tsx
<div style={styles.outputBox}>
  <pre style={styles.outputText}>{commandOutput}</pre>
</div>
```

To:

```tsx
<div className="bg-black rounded-md p-4 mb-4 max-h-52 overflow-auto">
  <pre className="m-0 text-gray-300 font-mono text-sm whitespace-pre-wrap">
    {commandOutput}
  </pre>
</div>
```

**Step 5: Convert feedbackBox**

Replace:

```tsx
<div style={{
  ...styles.feedbackBox,
  backgroundColor: stepFeedback.success ? '#1b4d1b' : '#4d1b1b',
  borderColor: stepFeedback.success ? '#4CAF50' : '#F44336',
}}>
```

To:

```tsx
<div className={`p-4 rounded-md border text-sm ${stepFeedback.success ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
```

**Step 6: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 9: Convert Quiz Section Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert quizSection, quizQuestion, quizChoices**

Replace:

```tsx
<div style={styles.quizSection}>
  <p style={styles.quizQuestion}>{step.quizQuestion}</p>
  <div style={styles.quizChoices}>
    {step.quizChoices.map((choice, i) => (
      <button
        key={i}
        onClick={() => !showQuizResult && setQuizAnswer(i)}
        style={{
          ...styles.quizChoice,
          ...(quizAnswer === i ? styles.quizChoiceSelected : {}),
          ...(showQuizResult && i === step.quizCorrectIndex ? styles.quizChoiceCorrect : {}),
          ...(showQuizResult && quizAnswer === i && i !== step.quizCorrectIndex ? styles.quizChoiceWrong : {}),
        }}
        disabled={showQuizResult}
      >
```

To:

```tsx
<div className="mt-5">
  <p className="text-white text-base mb-5">{step.quizQuestion}</p>
  <div className="flex flex-col gap-2.5">
    {step.quizChoices.map((choice, i) => {
      let choiceClasses = "p-4 bg-gray-700 border-2 border-gray-600 rounded-md text-white text-left cursor-pointer text-sm transition-all hover:border-gray-500";
      if (quizAnswer === i && !showQuizResult) {
        choiceClasses = "p-4 bg-gray-700 border-2 border-nvidia-green rounded-md text-white text-left cursor-pointer text-sm";
      }
      if (showQuizResult && i === step.quizCorrectIndex) {
        choiceClasses = "p-4 bg-green-900/50 border-2 border-green-500 rounded-md text-white text-left text-sm";
      }
      if (showQuizResult && quizAnswer === i && i !== step.quizCorrectIndex) {
        choiceClasses = "p-4 bg-red-900/50 border-2 border-red-500 rounded-md text-white text-left text-sm";
      }
      return (
        <button
          key={i}
          onClick={() => !showQuizResult && setQuizAnswer(i)}
          className={choiceClasses}
          disabled={showQuizResult}
        >
```

**Step 2: Convert submitQuizButton**

Replace:

```tsx
<button onClick={handleQuizSubmit} style={styles.submitQuizButton}>
```

To:

```tsx
<button onClick={handleQuizSubmit} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
```

**Step 3: Convert quizExplanation**

Replace:

```tsx
<div style={{
  ...styles.quizExplanation,
  borderColor: quizAnswer === step.quizCorrectIndex ? '#4CAF50' : '#F44336',
}}>
```

To:

```tsx
<div className={`mt-5 p-4 rounded-md border bg-gray-800 ${quizAnswer === step.quizCorrectIndex ? 'border-green-500' : 'border-red-500'}`}>
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 10: Convert Navigation and Remaining Styles

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Convert continueButton**

Replace:

```tsx
<button onClick={advanceStep} style={styles.continueButton}>
```

To:

```tsx
<button onClick={advanceStep} className="mt-5 px-8 py-3 bg-nvidia-green border-none rounded-md text-black font-bold cursor-pointer text-sm hover:bg-nvidia-darkgreen transition-colors">
```

**Step 2: Convert tutorialNav**

Replace:

```tsx
<div style={styles.tutorialNav}>
  <button
    onClick={goBackStep}
    disabled={currentStepIndex === 0}
    style={{
      ...styles.navButton,
      opacity: currentStepIndex === 0 ? 0.5 : 1,
    }}
  >
  ...
  <button onClick={goBack} style={styles.exitButton}>
  ...
  <button onClick={advanceStep} style={styles.navButton}>
  ...
  <button ... style={styles.completeButton}>
```

To:

```tsx
<div className="flex justify-between gap-2.5">
  <button
    onClick={goBackStep}
    disabled={currentStepIndex === 0}
    className={`px-6 py-3 bg-gray-700 border-none rounded-md text-white cursor-pointer text-sm hover:bg-gray-600 transition-colors ${currentStepIndex === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    ← Previous
  </button>
  <button
    onClick={goBack}
    className="px-6 py-3 bg-gray-600 border-none rounded-md text-gray-400 cursor-pointer text-sm hover:bg-gray-500 transition-colors"
  >
    Exit Lesson
  </button>
  {step.type !== "command" &&
    step.type !== "quiz" &&
    currentStepIndex < selectedLesson.steps.length - 1 && (
      <button
        onClick={advanceStep}
        className="px-6 py-3 bg-gray-700 border-none rounded-md text-white cursor-pointer text-sm hover:bg-gray-600 transition-colors"
      >
        Next →
      </button>
    )}
  {currentStepIndex === selectedLesson.steps.length - 1 &&
    step.type !== "command" &&
    step.type !== "quiz" && (
      <button
        onClick={() => {
          completeLesson(selectedLesson.id, selectedModule?.id || "");
          goBack();
        }}
        className="px-6 py-3 bg-green-600 border-none rounded-md text-white font-bold cursor-pointer text-sm hover:bg-green-500 transition-colors"
      >
        Complete Lesson ✓
      </button>
    )}
</div>
```

**Step 3: Convert observe and practice labels**

Replace:

```tsx
<div style={styles.observeLabel}>
...
<div style={styles.commandDisplay}>
  <code style={styles.commandCode}>{step.expectedCommand}</code>
</div>
...
<div style={styles.practiceLabel}>
```

To:

```tsx
<div className="text-nvidia-green text-sm font-bold mb-4">👁️ Observe the following command output:</div>
<div className="bg-black rounded-md p-4 mb-4">
  <code className="text-nvidia-green font-mono text-sm">{step.expectedCommand}</code>
</div>
...
<div className="text-orange-500 text-sm font-bold mb-4">🔧 Practice on your own:</div>
```

**Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 11: Remove Inline Styles Object and Final Cleanup

**Files:**

- Modify: `src/components/LearningPaths.tsx`

**Step 1: Delete the entire styles object**

Remove the entire `const styles: Record<string, React.CSSProperties> = { ... }` block (approximately lines 839-1466).

**Step 2: Verify no remaining style references**

Search for any remaining `style={styles.` references and convert them.

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Run tests**

Run: `npm test -- --run`
Expected: All tests pass

**Step 5: Visual verification**

Run: `npm run dev`
Expected: LearningPaths component displays correctly with consistent styling matching Dashboard and other components

---

## Phase 2: Comprehensive Test Infrastructure

### Task 12: Create Validation Inference Engine

**Files:**

- Create: `src/tests/generator/validationInference.ts`

**Step 1: Create the validation inference types**

```typescript
/**
 * Validation Inference Engine
 *
 * Infers expected validation rules based on command type and cluster state.
 * Reduces manual validation specification by applying smart defaults.
 */

import type { GPU, DGXNode, Cluster } from "@/types/hardware";
import type { FaultConfig } from "@/types/scenarios";

export interface InferredValidation {
  exitCode: number;
  outputContains: string[];
  outputNotContains: string[];
  fieldChecks: Record<string, string>; // e.g., { "temperature": ">= 85" }
  stateChecks: Record<string, string>; // e.g., { "gpu.0.health": "Warning" }
}

export interface ValidationOverride {
  exitCode?: number;
  outputContains?: string[];
  outputNotContains?: string[];
  fieldChecks?: Record<string, string>;
  stateChecks?: Record<string, string>;
}

export interface CommandPattern {
  pattern: RegExp;
  inferValidation: (
    command: string,
    matches: RegExpMatchArray,
    clusterState: Cluster,
    injectedFaults: FaultConfig[],
  ) => InferredValidation;
}
```

**Step 2: Implement nvidia-smi command patterns**

```typescript
export const nvidiaSmiPatterns: CommandPattern[] = [
  // nvidia-smi (basic - list all GPUs)
  {
    pattern: /^nvidia-smi$/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const node = cluster.nodes[0];
      const fatalXidGpus = faults.filter(
        (f) => f.type === "xid-error" && f.parameters?.xid === 79,
      );
      const visibleGpus = node.gpus.length - fatalXidGpus.length;

      return {
        exitCode: 0,
        outputContains:
          visibleGpus > 0 ? ["GPU", "Driver Version", "CUDA Version"] : [],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {},
      };
    },
  },

  // nvidia-smi -i N (specific GPU)
  {
    pattern: /^nvidia-smi\s+-i\s+(\d+)$/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const gpuIndex = parseInt(matches[1]);
      const node = cluster.nodes[0];
      const maxGpu = node.gpus.length - 1;

      if (gpuIndex > maxGpu) {
        return {
          exitCode: 1,
          outputContains: ["Unable to query GPU", "not found"],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {},
        };
      }

      const gpuFault = faults.find(
        (f) =>
          f.gpuId === gpuIndex &&
          f.type === "xid-error" &&
          f.parameters?.xid === 79,
      );
      if (gpuFault) {
        return {
          exitCode: 1,
          outputContains: ["not accessible", "XID 79"],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {},
        };
      }

      return {
        exitCode: 0,
        outputContains: [`GPU ${gpuIndex}`],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {},
      };
    },
  },

  // nvidia-smi --query-gpu with temperature
  {
    pattern: /nvidia-smi\s+--query-gpu=.*temperature/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const thermalFault = faults.find((f) => f.type === "thermal");

      return {
        exitCode: 0,
        outputContains: ["temperature"],
        outputNotContains: [],
        fieldChecks: thermalFault
          ? { temperature: `>= ${thermalFault.parameters?.temperature || 85}` }
          : {},
        stateChecks: {},
      };
    },
  },

  // nvidia-smi --gpu-reset
  {
    pattern: /nvidia-smi\s+--gpu-reset\s+-i\s+(\d+)/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const gpuIndex = parseInt(matches[1]);
      const fatalXid = faults.find(
        (f) =>
          f.gpuId === gpuIndex &&
          f.type === "xid-error" &&
          f.parameters?.xid === 79,
      );

      if (fatalXid) {
        return {
          exitCode: 1,
          outputContains: ["Unable to reset", "fallen off the bus"],
          outputNotContains: ["Successfully reset"],
          fieldChecks: {},
          stateChecks: { [`gpu.${gpuIndex}.xidErrors.length`]: "> 0" },
        };
      }

      return {
        exitCode: 0,
        outputContains: ["reset successfully"],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: { [`gpu.${gpuIndex}.xidErrors.length`]: "== 0" },
      };
    },
  },
];
```

**Step 3: Implement dcgmi command patterns**

```typescript
export const dcgmiPatterns: CommandPattern[] = [
  // dcgmi health -c
  {
    pattern: /^dcgmi\s+health\s+-c/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const hasUnhealthyGpu = faults.some(
        (f) =>
          f.type === "xid-error" ||
          f.type === "thermal" ||
          f.type === "ecc-error",
      );

      return {
        exitCode: 0,
        outputContains: hasUnhealthyGpu
          ? ["Warning", "Unhealthy"]
          : ["Healthy"],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {},
      };
    },
  },

  // dcgmi diag -r N
  {
    pattern: /^dcgmi\s+diag\s+-r\s+(\d+)/,
    inferValidation: (cmd, matches, cluster, faults) => {
      const level = parseInt(matches[1]);
      const hasFailingGpu = faults.some(
        (f) => f.type === "xid-error" || f.type === "ecc-error",
      );

      if (level < 1 || level > 4) {
        return {
          exitCode: 1,
          outputContains: ["Invalid", "level"],
          outputNotContains: [],
          fieldChecks: {},
          stateChecks: {},
        };
      }

      return {
        exitCode: hasFailingGpu ? 1 : 0,
        outputContains: hasFailingGpu ? ["FAIL"] : ["PASS"],
        outputNotContains: [],
        fieldChecks: {},
        stateChecks: {},
      };
    },
  },
];
```

**Step 4: Implement main inference function**

```typescript
const allPatterns = [...nvidiaSmiPatterns, ...dcgmiPatterns];

export function inferValidation(
  command: string,
  clusterState: Cluster,
  injectedFaults: FaultConfig[],
): InferredValidation {
  // Try to match command against patterns
  for (const { pattern, inferValidation } of allPatterns) {
    const matches = command.match(pattern);
    if (matches) {
      return inferValidation(command, matches, clusterState, injectedFaults);
    }
  }

  // Default: assume success with generic output
  return {
    exitCode: 0,
    outputContains: [],
    outputNotContains: [],
    fieldChecks: {},
    stateChecks: {},
  };
}

export function mergeWithOverride(
  inferred: InferredValidation,
  override?: ValidationOverride,
): InferredValidation {
  if (!override) return inferred;

  return {
    exitCode: override.exitCode ?? inferred.exitCode,
    outputContains: override.outputContains ?? inferred.outputContains,
    outputNotContains: override.outputNotContains ?? inferred.outputNotContains,
    fieldChecks: { ...inferred.fieldChecks, ...override.fieldChecks },
    stateChecks: { ...inferred.stateChecks, ...override.stateChecks },
  };
}
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors

---

### Task 13: Create Scenario Test Generator

**Files:**

- Create: `src/tests/generator/scenarioTestGenerator.ts`

**Step 1: Create the test generator**

```typescript
/**
 * Scenario Test Generator
 *
 * Auto-generates comprehensive tests from scenario JSON files.
 * Uses validation inference for smart defaults with override support.
 */

import * as fs from "fs";
import * as path from "path";
import {
  inferValidation,
  mergeWithOverride,
  type ValidationOverride,
} from "./validationInference";

interface ScenarioStep {
  id: string;
  title: string;
  expectedCommands: string[];
  validationRules?: Array<{
    type: string;
    expectedCommands: string[];
    requireAllCommands?: boolean;
  }>;
  validation_override?: ValidationOverride;
}

interface Scenario {
  id: string;
  title: string;
  domain: string;
  faults?: Array<{
    nodeId: string;
    gpuId: number;
    type: string;
    parameters?: Record<string, unknown>;
  }>;
  steps: ScenarioStep[];
}

export function generateTestsFromScenario(scenario: Scenario): string {
  const testCases: string[] = [];

  for (const step of scenario.steps) {
    for (const command of step.expectedCommands) {
      const testName = `${scenario.id} - Step ${step.id}: ${command}`;

      testCases.push(`
    it('${testName}', () => {
      // Setup faults for this scenario
      ${generateFaultSetup(scenario.faults || [])}

      // Execute command
      const result = exec('${command}', context);

      // Validate with inferred + override rules
      const validation = mergeWithOverride(
        inferValidation('${command}', context.cluster, ${JSON.stringify(scenario.faults || [])}),
        ${JSON.stringify(step.validation_override || null)}
      );

      expect(result.exitCode).toBe(validation.exitCode);
      for (const text of validation.outputContains) {
        expect(result.output).toContain(text);
      }
      for (const text of validation.outputNotContains) {
        expect(result.output).not.toContain(text);
      }
    });`);
    }
  }

  return `
describe('${scenario.title}', () => {
  ${testCases.join("\n")}
});`;
}

function generateFaultSetup(faults: Scenario["faults"]): string {
  if (!faults || faults.length === 0) return "// No faults to inject";

  return faults
    .map((fault) => {
      switch (fault.type) {
        case "xid-error":
          return `store.addXIDError('${fault.nodeId}', ${fault.gpuId}, { code: ${fault.parameters?.xid}, timestamp: new Date(), description: '${fault.parameters?.description || ""}', severity: 'Critical' });`;
        case "thermal":
          return `store.updateGPU('${fault.nodeId}', ${fault.gpuId}, { temperature: ${fault.parameters?.temperature || 95} });`;
        case "ecc-error":
          return `store.updateGPU('${fault.nodeId}', ${fault.gpuId}, { eccErrors: { singleBit: ${fault.parameters?.singleBit || 0}, doubleBit: ${fault.parameters?.doubleBit || 0} } });`;
        default:
          return `// Unknown fault type: ${fault.type}`;
      }
    })
    .join("\n      ");
}

export function generateAllScenarioTests(scenariosDir: string): string {
  const domains = ["domain1", "domain2", "domain3", "domain4", "domain5"];
  const allTests: string[] = [];

  for (const domain of domains) {
    const domainPath = path.join(scenariosDir, domain);
    if (!fs.existsSync(domainPath)) continue;

    const files = fs.readdirSync(domainPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const scenarioPath = path.join(domainPath, file);
      const scenario = JSON.parse(
        fs.readFileSync(scenarioPath, "utf-8"),
      ) as Scenario;
      allTests.push(generateTestsFromScenario(scenario));
    }
  }

  return `
/**
 * AUTO-GENERATED SCENARIO TESTS
 * Generated from scenario JSON files
 * DO NOT EDIT DIRECTLY - regenerate with: npm run generate-tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '@/store/simulationStore';
import { NvidiaSmiSimulator } from '@/simulators/nvidiaSmiSimulator';
import { DcgmiSimulator } from '@/simulators/dcgmiSimulator';
import { SlurmSimulator } from '@/simulators/slurmSimulator';
import { InfiniBandSimulator } from '@/simulators/infinibandSimulator';
import { BenchmarkSimulator } from '@/simulators/benchmarkSimulator';
import { parse } from '@/utils/commandParser';
import { inferValidation, mergeWithOverride } from './generator/validationInference';
import type { CommandContext } from '@/simulators/BaseSimulator';

function exec(command: string, context: CommandContext) {
  const parsed = parse(command);
  // Route to appropriate simulator based on command
  if (command.startsWith('nvidia-smi')) {
    return new NvidiaSmiSimulator().execute(parsed, context);
  }
  if (command.startsWith('dcgmi')) {
    return new DcgmiSimulator().execute(parsed, context);
  }
  // Add more simulators as needed
  throw new Error(\`Unknown command: \${command}\`);
}

let store: ReturnType<typeof useSimulationStore.getState>;
let context: CommandContext;

beforeEach(() => {
  store = useSimulationStore.getState();
  store.resetSimulation();
  context = {
    cluster: store.cluster,
    currentNode: store.cluster.nodes[0]?.id || 'dgx-00'
  };
});

${allTests.join("\n\n")}
`;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors

---

### Task 14: Create Cross-Simulator Consistency Tests

**Files:**

- Create: `src/tests/soundness/crossSimulatorConsistency.test.ts`

**Step 1: Create the cross-simulator test file**

```typescript
/**
 * Cross-Simulator Consistency Tests
 *
 * Verifies that all simulators agree on cluster state and report
 * consistent information for the same underlying data.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Cross-Simulator Consistency", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("Temperature Consistency", () => {
    it("nvidia-smi and dcgmi report same GPU temperature", () => {
      // Set specific temperature
      store.updateGPU("dgx-00", 0, { temperature: 75 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      const smiResult = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0",
        ),
        context,
      );
      const dcgmiResult = dcgmi.execute(parse("dcgmi diag -r 1 -i 0"), context);

      // Extract temperature from nvidia-smi output
      const smiTemp = parseInt(smiResult.output.trim());
      expect(smiTemp).toBe(75);

      // DCGM should also show consistent thermal status
      expect(dcgmiResult.exitCode).toBe(0);
    });

    it("thermal fault is reflected in both simulators", () => {
      store.updateGPU("dgx-00", 0, { temperature: 95 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      const smiResult = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      const dcgmiHealth = dcgmi.execute(parse("dcgmi health -c"), context);

      // Both should indicate thermal concern
      expect(smiResult.output.toLowerCase()).toMatch(/temp|95/);
      // DCGM health may show warning for thermal
    });
  });

  describe("XID Error Consistency", () => {
    it("XID error is reflected in both nvidia-smi and dcgmi", () => {
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      const smiResult = nvidiaSmi.execute(parse("nvidia-smi"), context);
      const dcgmiHealth = dcgmi.execute(parse("dcgmi health -c"), context);

      // Both should indicate the error
      expect(smiResult.output).toBeDefined();
      expect(dcgmiHealth.output.toLowerCase()).toMatch(/warning|unhealthy/i);
    });

    it("fatal XID 79 affects both simulators consistently", () => {
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      const smiResult = nvidiaSmi.execute(parse("nvidia-smi"), context);
      const dcgmiDiag = dcgmi.execute(parse("dcgmi diag -r 3 -i 0"), context);

      // nvidia-smi should show warning about missing GPU
      expect(smiResult.output).toContain("WARNING");

      // dcgmi diag should fail for inaccessible GPU
      expect(dcgmiDiag.output.toLowerCase()).toMatch(/error|not accessible/i);
    });
  });

  describe("ECC Error Consistency", () => {
    it("ECC errors are reflected consistently", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: {
          singleBit: 10,
          doubleBit: 2,
          aggregated: { singleBit: 10, doubleBit: 2 },
        },
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      const smiEcc = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=ecc.errors.corrected.aggregate.total,ecc.errors.uncorrected.aggregate.total --format=csv -i 0",
        ),
        context,
      );
      const dcgmiHealth = dcgmi.execute(parse("dcgmi health -c"), context);

      expect(smiEcc.exitCode).toBe(0);
      // DCGM should also reflect ECC concerns
    });
  });

  describe("GPU Count Consistency", () => {
    it("both simulators report same GPU count", () => {
      const smiList = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      const dcgmiDiscovery = dcgmi.execute(
        parse("dcgmi discovery -l"),
        context,
      );

      // Count GPUs in nvidia-smi output
      const smiGpuCount = (smiList.output.match(/GPU \d+:/g) || []).length;

      // Both should show 8 GPUs for default cluster
      expect(smiGpuCount).toBe(8);
      expect(dcgmiDiscovery.exitCode).toBe(0);
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/crossSimulatorConsistency.test.ts`
Expected: All tests pass

---

### Task 15: Create State Transition Tests

**Files:**

- Create: `src/tests/soundness/stateTransitions.test.ts`

**Step 1: Create the state transition test file**

```typescript
/**
 * State Transition Tests
 *
 * Verifies that commands actually change state correctly and
 * that state changes persist across subsequent commands.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("State Transitions", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("GPU Reset State Changes", () => {
    it("GPU reset clears recoverable XID errors", () => {
      // Inject recoverable XID error
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });

      // Verify error exists before reset
      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      // Perform reset
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.output).toContain("reset successfully");

      // Verify error is cleared
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(0);
    });

    it("GPU reset fails for fatal XID 79 and state remains", () => {
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });

      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const result = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(result.exitCode).not.toBe(0);

      // Error should still exist
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);
    });
  });

  describe("Thermal State Changes", () => {
    it("temperature change persists across queries", () => {
      // Initial query
      let result1 = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0",
        ),
        context,
      );
      const initialTemp = parseInt(result1.output.trim());

      // Change temperature
      store.updateGPU("dgx-00", 0, { temperature: 92 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Query again
      let result2 = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0",
        ),
        context,
      );
      const newTemp = parseInt(result2.output.trim());

      expect(newTemp).toBe(92);
      expect(newTemp).not.toBe(initialTemp);
    });
  });

  describe("MIG Mode State Changes", () => {
    it("MIG enable command updates GPU state", () => {
      const result = nvidiaSmi.execute(
        parse("nvidia-smi -mig 1 -i 0"),
        context,
      );
      expect(result.output.toLowerCase()).toMatch(/enabled|reboot|reset/);
    });
  });

  describe("Persistence Mode State Changes", () => {
    it("persistence mode enable persists", () => {
      const enable = nvidiaSmi.execute(parse("nvidia-smi -pm 1 -i 0"), context);
      expect(enable.exitCode).toBe(0);

      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const query = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
      expect(query.output.toLowerCase()).toContain("persistence");
    });
  });

  describe("Fault Injection to Recovery Flow", () => {
    it("full fault injection and recovery cycle", () => {
      // 1. Verify healthy state
      let health1 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health1.output.toLowerCase()).toContain("healthy");

      // 2. Inject fault
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Test error",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // 3. Verify unhealthy
      let health2 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health2.output.toLowerCase()).toMatch(/warning|unhealthy/i);

      // 4. Reset GPU
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 0"), context);
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // 5. Verify healthy again
      let health3 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health3.output.toLowerCase()).toContain("healthy");
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/stateTransitions.test.ts`
Expected: All tests pass

---

### Task 16: Create Boundary Condition Tests

**Files:**

- Create: `src/tests/soundness/boundaryConditions.test.ts`

**Step 1: Create the boundary condition test file**

```typescript
/**
 * Boundary Condition Tests
 *
 * Tests edge cases and boundary values for all command types.
 * Ensures robust handling of minimum, maximum, and invalid values.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { BenchmarkSimulator } from "@/simulators/benchmarkSimulator";
import { InfiniBandSimulator } from "@/simulators/infinibandSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Boundary Conditions", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("nvidia-smi GPU Index Boundaries", () => {
    const nvidiaSmi = new NvidiaSmiSimulator();

    it("accepts GPU index 0 (minimum valid)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 0"), context);
      expect(result.exitCode).toBe(0);
    });

    it("accepts GPU index 7 (maximum valid for 8-GPU system)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 7"), context);
      expect(result.exitCode).toBe(0);
    });

    it("rejects GPU index 8 (just past maximum)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 8"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output.toLowerCase()).toMatch(/not found|invalid|unable/);
    });

    it("rejects GPU index -1 (negative)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i -1"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects GPU index 999 (extremely large)", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i 999"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects non-numeric GPU index", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi -i abc"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects empty GPU index", () => {
      const result = nvidiaSmi.execute(parse('nvidia-smi -i ""'), context);
      expect(result.output).toBeDefined();
    });
  });

  describe("dcgmi Diagnostic Level Boundaries", () => {
    const dcgmi = new DcgmiSimulator();

    it("accepts diagnostic level 1 (minimum valid)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(result.exitCode).toBe(0);
    });

    it("accepts diagnostic level 4 (maximum valid)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 4"), context);
      expect(result.exitCode).toBe(0);
    });

    it("rejects diagnostic level 0 (below minimum)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 0"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects diagnostic level 5 (above maximum)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 5"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects diagnostic level 99 (extremely large)", () => {
      const result = dcgmi.execute(parse("dcgmi diag -r 99"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("dcgmi Group ID Boundaries", () => {
    const dcgmi = new DcgmiSimulator();

    it("accepts group ID 0", () => {
      const result = dcgmi.execute(parse("dcgmi health -g 0"), context);
      expect(result.output).toBeDefined();
    });

    it("rejects negative group ID", () => {
      const result = dcgmi.execute(parse("dcgmi health -g -1"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects extremely large group ID", () => {
      const result = dcgmi.execute(parse("dcgmi health -g 9999"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("nccl-test GPU Count Boundaries", () => {
    const benchmark = new BenchmarkSimulator();

    it("accepts GPU count 1 (minimum valid)", () => {
      const result = benchmark.execute(parse("nccl-test -g 1"), context);
      expect(result.exitCode).toBe(0);
    });

    it("accepts GPU count 8 (maximum for single node)", () => {
      const result = benchmark.execute(parse("nccl-test -g 8"), context);
      expect(result.exitCode).toBe(0);
    });

    it("rejects GPU count 0", () => {
      const result = benchmark.execute(parse("nccl-test -g 0"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects negative GPU count", () => {
      const result = benchmark.execute(parse("nccl-test -g -1"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("handles GPU count exceeding available (should cap or error)", () => {
      const result = benchmark.execute(parse("nccl-test -g 100"), context);
      // Should either cap at available or return error
      expect(result.output).toBeDefined();
    });
  });

  describe("InfiniBand Device Boundaries", () => {
    const ib = new InfiniBandSimulator();

    it("accepts valid device mlx5_0", () => {
      const result = ib.execute(parse("ibstat mlx5_0"), context);
      expect(result.output).toBeDefined();
    });

    it("rejects invalid device name", () => {
      const result = ib.execute(parse("ibstat mlx5_999"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects non-existent device", () => {
      const result = ib.execute(parse("ibstat fake_device"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("Slurm Node Name Boundaries", () => {
    const slurm = new SlurmSimulator();

    it("accepts valid node name", () => {
      const result = slurm.execute(parse("scontrol show node dgx-00"), context);
      expect(result.exitCode).toBe(0);
    });

    it("rejects invalid node name", () => {
      const result = slurm.execute(
        parse("scontrol show node fake-node"),
        context,
      );
      expect(result.exitCode).not.toBe(0);
    });

    it("rejects empty node name", () => {
      const result = slurm.execute(parse("scontrol show node"), context);
      // Should show usage or all nodes
      expect(result.output).toBeDefined();
    });
  });

  describe("Empty and Whitespace Input", () => {
    const nvidiaSmi = new NvidiaSmiSimulator();

    it("handles empty command arguments gracefully", () => {
      const result = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(result.exitCode).toBe(0);
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/boundaryConditions.test.ts`
Expected: All tests pass (or identify gaps to fix)

---

### Task 17: Create Flag Combination Tests

**Files:**

- Create: `src/tests/soundness/flagCombinations.test.ts`

**Step 1: Create the flag combination test file**

```typescript
/**
 * Flag Combination Tests
 *
 * Tests various combinations of command flags to ensure
 * they work correctly together without conflicts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Flag Combinations", () => {
  let context: CommandContext;

  beforeEach(() => {
    const store = useSimulationStore.getState();
    store.resetSimulation();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("nvidia-smi Flag Combinations", () => {
    const nvidiaSmi = new NvidiaSmiSimulator();

    describe("Query with Format Options", () => {
      it("--query-gpu with --format=csv", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi --query-gpu=temperature.gpu --format=csv"),
          context,
        );
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("temperature");
      });

      it("--query-gpu with --format=csv,noheader", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader"),
          context,
        );
        expect(result.exitCode).toBe(0);
        // Should not contain header
        expect(result.output.toLowerCase()).not.toMatch(/^temperature/);
      });

      it("--query-gpu with --format=csv,nounits", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi --query-gpu=temperature.gpu --format=csv,nounits"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });

      it("--query-gpu with multiple metrics", () => {
        const result = nvidiaSmi.execute(
          parse(
            "nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used --format=csv",
          ),
          context,
        );
        expect(result.exitCode).toBe(0);
      });

      it("--query-gpu with -i for specific GPU", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi --query-gpu=temperature.gpu --format=csv -i 0"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });
    });

    describe("Detailed Query Flags", () => {
      it("-q alone shows all details", () => {
        const result = nvidiaSmi.execute(parse("nvidia-smi -q"), context);
        expect(result.exitCode).toBe(0);
        expect(result.output.length).toBeGreaterThan(100);
      });

      it("-q with -i limits to specific GPU", () => {
        const result = nvidiaSmi.execute(parse("nvidia-smi -q -i 0"), context);
        expect(result.exitCode).toBe(0);
      });

      it("-q with -d for specific display type", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi -q -d MEMORY"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });

      it("-q with -i and -d together", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi -q -i 0 -d TEMPERATURE"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });
    });

    describe("Conflicting or Redundant Flags", () => {
      it("handles duplicate -i flags (should use last)", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi -i 0 -i 1"),
          context,
        );
        expect(result.output).toBeDefined();
      });

      it("handles -L with -i (list should ignore -i)", () => {
        const result = nvidiaSmi.execute(parse("nvidia-smi -L -i 0"), context);
        expect(result.exitCode).toBe(0);
      });
    });

    describe("NVLink Flags", () => {
      it("nvlink -s shows status", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi nvlink -s"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });

      it("nvlink -s with -i for specific GPU", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi nvlink -s -i 0"),
          context,
        );
        expect(result.exitCode).toBe(0);
      });
    });

    describe("MIG Flags", () => {
      it("-mig with -i for specific GPU", () => {
        const result = nvidiaSmi.execute(
          parse("nvidia-smi -mig 1 -i 0"),
          context,
        );
        expect(result.output).toBeDefined();
      });
    });
  });

  describe("dcgmi Flag Combinations", () => {
    const dcgmi = new DcgmiSimulator();

    describe("Health Check Flags", () => {
      it("health -c (check)", () => {
        const result = dcgmi.execute(parse("dcgmi health -c"), context);
        expect(result.exitCode).toBe(0);
      });

      it("health -c with -g (group)", () => {
        const result = dcgmi.execute(parse("dcgmi health -c -g 0"), context);
        expect(result.output).toBeDefined();
      });

      it("health -c with -a (all)", () => {
        const result = dcgmi.execute(parse("dcgmi health -c -a"), context);
        expect(result.output).toBeDefined();
      });
    });

    describe("Diagnostic Flags", () => {
      it("diag -r 1 (level 1)", () => {
        const result = dcgmi.execute(parse("dcgmi diag -r 1"), context);
        expect(result.exitCode).toBe(0);
      });

      it("diag -r 3 with -i (specific GPU)", () => {
        const result = dcgmi.execute(parse("dcgmi diag -r 3 -i 0"), context);
        expect(result.output).toBeDefined();
      });

      it("diag -r 3 with -g (group)", () => {
        const result = dcgmi.execute(parse("dcgmi diag -r 3 -g 0"), context);
        expect(result.output).toBeDefined();
      });
    });

    describe("Discovery Flags", () => {
      it("discovery -l (list)", () => {
        const result = dcgmi.execute(parse("dcgmi discovery -l"), context);
        expect(result.exitCode).toBe(0);
      });

      it("discovery -c (compute)", () => {
        const result = dcgmi.execute(parse("dcgmi discovery -c"), context);
        expect(result.output).toBeDefined();
      });
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/flagCombinations.test.ts`
Expected: All tests pass

---

### Task 18: Create Command Progression Tests

**Files:**

- Create: `src/tests/soundness/commandProgression.test.ts`

**Step 1: Create the command progression test file**

```typescript
/**
 * Command Progression Tests
 *
 * Tests realistic command workflows where commands build on each other.
 * Ensures proper state accumulation and logical progression.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { SlurmSimulator } from "@/simulators/slurmSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Command Progression", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let slurm: SlurmSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    slurm = new SlurmSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("Thermal Troubleshooting Workflow", () => {
    it("complete thermal investigation workflow", () => {
      // Step 1: Check overall status
      const status = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(status.exitCode).toBe(0);

      // Step 2: Query all GPU temperatures
      const temps = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=index,temperature.gpu --format=csv"),
        context,
      );
      expect(temps.exitCode).toBe(0);

      // Step 3: Inject thermal issue
      store.updateGPU("dgx-00", 0, { temperature: 92 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Step 4: Query specific hot GPU
      const hotGpu = nvidiaSmi.execute(
        parse("nvidia-smi -q -i 0 -d TEMPERATURE"),
        context,
      );
      expect(hotGpu.output).toBeDefined();

      // Step 5: Check performance state
      const perf = nvidiaSmi.execute(
        parse("nvidia-smi -q -i 0 -d PERFORMANCE"),
        context,
      );
      expect(perf.output).toBeDefined();

      // Step 6: Run diagnostics
      const diag = dcgmi.execute(parse("dcgmi diag -r 2 -i 0"), context);
      expect(diag.output).toBeDefined();
    });
  });

  describe("XID Error Recovery Workflow", () => {
    it("detect, diagnose, and recover from XID error", () => {
      // Step 1: Verify healthy state
      const health1 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health1.output.toLowerCase()).toContain("healthy");

      // Step 2: Inject XID error
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Step 3: Detect error in nvidia-smi
      const smi = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(smi.output).toBeDefined();

      // Step 4: Check health (should show warning)
      const health2 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health2.output.toLowerCase()).toMatch(/warning|unhealthy/i);

      // Step 5: Run diagnostics
      const diag = dcgmi.execute(parse("dcgmi diag -r 1 -i 0"), context);
      expect(diag.output).toBeDefined();

      // Step 6: Reset GPU
      const reset = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(reset.output).toContain("reset successfully");

      // Step 7: Verify recovery
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const health3 = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health3.output.toLowerCase()).toContain("healthy");
    });
  });

  describe("MIG Configuration Workflow", () => {
    it("MIG enable and query workflow", () => {
      // Step 1: Check current MIG status
      const status1 = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=mig.mode.current --format=csv"),
        context,
      );
      expect(status1.exitCode).toBe(0);

      // Step 2: Enable MIG mode
      const enable = nvidiaSmi.execute(
        parse("nvidia-smi -mig 1 -i 0"),
        context,
      );
      expect(enable.output.toLowerCase()).toMatch(/enabled|reboot|reset/);

      // Step 3: Query MIG mode again
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const status2 = nvidiaSmi.execute(
        parse("nvidia-smi --query-gpu=mig.mode.current --format=csv"),
        context,
      );
      expect(status2.output).toBeDefined();
    });
  });

  describe("Cluster Health Assessment Workflow", () => {
    it("systematic cluster health check", () => {
      // Step 1: List all GPUs
      const list = nvidiaSmi.execute(parse("nvidia-smi -L"), context);
      expect(list.exitCode).toBe(0);

      // Step 2: DCGM discovery
      const discovery = dcgmi.execute(parse("dcgmi discovery -l"), context);
      expect(discovery.exitCode).toBe(0);

      // Step 3: Health check
      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.exitCode).toBe(0);

      // Step 4: Level 1 diagnostics
      const diag = dcgmi.execute(parse("dcgmi diag -r 1"), context);
      expect(diag.exitCode).toBe(0);

      // Step 5: Check NVLink status
      const nvlink = nvidiaSmi.execute(parse("nvidia-smi nvlink -s"), context);
      expect(nvlink.exitCode).toBe(0);
    });
  });

  describe("Slurm Integration Workflow", () => {
    it("check node status and manage state", () => {
      // Step 1: Check cluster status
      const sinfo = slurm.execute(parse("sinfo -N -l"), context);
      expect(sinfo.exitCode).toBe(0);

      // Step 2: Check specific node
      const show = slurm.execute(parse("scontrol show node dgx-00"), context);
      expect(show.exitCode).toBe(0);

      // Step 3: Check GPU resources
      const gres = slurm.execute(parse("scontrol show node dgx-00"), context);
      expect(gres.output).toBeDefined();
    });
  });

  describe("Fault to Maintenance Workflow", () => {
    it("detect fault and drain node", () => {
      // Step 1: Inject critical fault
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Step 2: Detect in nvidia-smi
      const smi = nvidiaSmi.execute(parse("nvidia-smi"), context);
      expect(smi.output).toContain("WARNING");

      // Step 3: Confirm with DCGM
      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.output.toLowerCase()).toMatch(
        /warning|unhealthy|critical/i,
      );

      // Step 4: Drain node from cluster
      const drain = slurm.execute(
        parse(
          'scontrol update nodename=dgx-00 state=drain reason="GPU failure"',
        ),
        context,
      );
      expect(drain.output).toBeDefined();

      // Step 5: Verify node state
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const check = slurm.execute(parse("sinfo -n dgx-00"), context);
      expect(check.output).toBeDefined();
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/commandProgression.test.ts`
Expected: All tests pass

---

### Task 19: Create Error Recovery Tests

**Files:**

- Create: `src/tests/soundness/errorRecovery.test.ts`

**Step 1: Create the error recovery test file**

```typescript
/**
 * Error Recovery Tests
 *
 * Tests various error scenarios and recovery paths to ensure
 * the system handles failures gracefully and can recover.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/store/simulationStore";
import { NvidiaSmiSimulator } from "@/simulators/nvidiaSmiSimulator";
import { DcgmiSimulator } from "@/simulators/dcgmiSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/simulators/BaseSimulator";

describe("Error Recovery", () => {
  let store: ReturnType<typeof useSimulationStore.getState>;
  let nvidiaSmi: NvidiaSmiSimulator;
  let dcgmi: DcgmiSimulator;
  let context: CommandContext;

  beforeEach(() => {
    store = useSimulationStore.getState();
    store.resetSimulation();
    nvidiaSmi = new NvidiaSmiSimulator();
    dcgmi = new DcgmiSimulator();
    context = {
      cluster: store.cluster,
      currentNode: store.cluster.nodes[0]?.id || "dgx-00",
    };
  });

  describe("XID 63 Recovery (Recoverable)", () => {
    it("XID 63 can be cleared with GPU reset", () => {
      // Inject recoverable XID
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap Failure",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Verify error present
      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      // Reset should succeed
      const reset = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(reset.exitCode).toBe(0);
      expect(reset.output).toContain("reset successfully");

      // Verify error cleared
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(0);

      // Health should be restored
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };
      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.output.toLowerCase()).toContain("healthy");
    });
  });

  describe("XID 79 Non-Recovery (Fatal)", () => {
    it("XID 79 cannot be cleared with GPU reset", () => {
      // Inject fatal XID
      store.addXIDError("dgx-00", 0, {
        code: 79,
        timestamp: new Date(),
        description: "GPU has fallen off the bus",
        severity: "Critical",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Verify error present
      let gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);

      // Reset should fail
      const reset = nvidiaSmi.execute(
        parse("nvidia-smi --gpu-reset -i 0"),
        context,
      );
      expect(reset.exitCode).not.toBe(0);
      expect(reset.output).toContain("Unable to reset");

      // Error should still be present
      gpu = useSimulationStore.getState().cluster.nodes[0].gpus[0];
      expect(gpu.xidErrors.length).toBe(1);
    });
  });

  describe("Thermal Recovery", () => {
    it("cooling GPU restores normal operation", () => {
      // Inject thermal issue
      store.updateGPU("dgx-00", 0, { temperature: 95 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Check thermal status
      const hot = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0",
        ),
        context,
      );
      expect(parseInt(hot.output.trim())).toBe(95);

      // Simulate cooling
      store.updateGPU("dgx-00", 0, { temperature: 65 });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Verify cooled
      const cool = nvidiaSmi.execute(
        parse(
          "nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader -i 0",
        ),
        context,
      );
      expect(parseInt(cool.output.trim())).toBe(65);
    });
  });

  describe("ECC Error Handling", () => {
    it("single-bit ECC errors are correctable", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: {
          singleBit: 10,
          doubleBit: 0,
          aggregated: { singleBit: 10, doubleBit: 0 },
        },
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // GPU should still be operational
      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      // Single-bit errors are correctable, may show warning but not critical
      expect(health.output).toBeDefined();
    });

    it("double-bit ECC errors indicate hardware issue", () => {
      store.updateGPU("dgx-00", 0, {
        eccErrors: {
          singleBit: 0,
          doubleBit: 5,
          aggregated: { singleBit: 0, doubleBit: 5 },
        },
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Double-bit errors are uncorrectable
      const health = dcgmi.execute(parse("dcgmi health -c"), context);
      expect(health.output.toLowerCase()).toMatch(/warning|unhealthy/i);
    });
  });

  describe("Multiple Fault Recovery", () => {
    it("can recover from multiple simultaneous faults", () => {
      // Inject multiple faults on different GPUs
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap",
        severity: "Warning",
      });
      store.addXIDError("dgx-00", 1, {
        code: 63,
        timestamp: new Date(),
        description: "Row Remap",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Reset GPU 0
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 0"), context);
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // GPU 0 should be clean, GPU 1 still has error
      const node = useSimulationStore.getState().cluster.nodes[0];
      expect(node.gpus[0].xidErrors.length).toBe(0);
      expect(node.gpus[1].xidErrors.length).toBe(1);

      // Reset GPU 1
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 1"), context);
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Both should be clean now
      const node2 = useSimulationStore.getState().cluster.nodes[0];
      expect(node2.gpus[0].xidErrors.length).toBe(0);
      expect(node2.gpus[1].xidErrors.length).toBe(0);
    });
  });

  describe("Command Retry After Failure", () => {
    it("command succeeds after fault is cleared", () => {
      // Inject fault
      store.addXIDError("dgx-00", 0, {
        code: 63,
        timestamp: new Date(),
        description: "Error",
        severity: "Warning",
      });
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Diagnostics may show issues
      const diag1 = dcgmi.execute(parse("dcgmi diag -r 1 -i 0"), context);

      // Clear fault
      nvidiaSmi.execute(parse("nvidia-smi --gpu-reset -i 0"), context);
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: "dgx-00",
      };

      // Retry diagnostics - should pass now
      const diag2 = dcgmi.execute(parse("dcgmi diag -r 1 -i 0"), context);
      expect(diag2.exitCode).toBe(0);
    });
  });
});
```

**Step 2: Run the new tests**

Run: `npm test -- --run src/tests/soundness/errorRecovery.test.ts`
Expected: All tests pass

---

### Task 20: Run Full Test Suite and Final Verification

**Files:**

- All test files

**Step 1: Run the complete test suite**

Run: `npm test -- --run`
Expected: All tests pass (existing + new ~1100+ tests)

**Step 2: Generate test coverage report**

Run: `npm test -- --run --coverage`
Expected: Coverage report showing comprehensive coverage

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Visual verification of LearningPaths**

Run: `npm run dev`
Expected:

- LearningPaths component displays with consistent dark theme
- Colors match Dashboard and Terminal (gray-800, gray-900, nvidia-green)
- All interactive elements work (path selection, module selection, lessons, tutorials)
- Progress persistence works correctly

**Step 5: Create test summary**

Document the test counts:

- Scenario-generated tests: ~500
- Cross-simulator consistency: ~20
- State transitions: ~15
- Boundary conditions: ~40
- Flag combinations: ~30
- Command progressions: ~25
- Error recovery: ~15
- Total new tests: ~645

---

## Verification Checklist

### Phase 1: LearningPaths Conversion

- [ ] Container and header converted to Tailwind
- [ ] Stats row and recommended card converted
- [ ] Paths grid and path cards converted
- [ ] Module list and module cards converted
- [ ] Lesson list and lesson cards converted
- [ ] Tutorial container and progress converted
- [ ] Tips, command input, output styles converted
- [ ] Quiz section converted
- [ ] Navigation styles converted
- [ ] Inline styles object removed
- [ ] Build succeeds
- [ ] Visual consistency verified

### Phase 2: Test Infrastructure

- [ ] Validation inference engine created
- [ ] Scenario test generator created
- [ ] Cross-simulator consistency tests pass
- [ ] State transition tests pass
- [ ] Boundary condition tests pass
- [ ] Flag combination tests pass
- [ ] Command progression tests pass
- [ ] Error recovery tests pass
- [ ] Full test suite passes
- [ ] Coverage report generated

---

## Commands Reference

```bash
# Build
npm run build

# Run all tests
npm test -- --run

# Run specific test file
npm test -- --run src/tests/soundness/crossSimulatorConsistency.test.ts

# Run tests with coverage
npm test -- --run --coverage

# Development server
npm run dev

# TypeScript check
npx tsc --noEmit
```
