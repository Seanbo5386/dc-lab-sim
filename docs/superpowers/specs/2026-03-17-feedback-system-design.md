# Feedback System Design

## Overview

Add a user feedback form accessible from the app header. Authenticated users can submit general feedback, bug reports, or success stories. Feedback is stored in DynamoDB via Amplify's existing infrastructure.

## UI

### Header Button Group

Restructure the top-right header area into a visually grouped set of three buttons:

```
[ Tour ] [ Feedback ] [ Sign In ]
```

- All three buttons share consistent styling (border, padding, hover states)
- Feedback button uses `MessageSquare` icon from lucide-react
- Clicking Feedback opens a modal dialog

### Feedback Modal

**When signed in:**

- Category selector: three pill buttons — "General Feedback" | "Bug Report" | "Success Story"
- Text area (~4 rows), placeholder changes per category:
  - General: "What could we do better?"
  - Bug: "Describe what happened and what you expected"
  - Success: "Did this help you pass the NCP-AII? We'd love to hear about it!"
- Submit button — disabled while empty or submitting
- After submit: brief success message, then auto-close

**When not signed in:**

- Form fields visible but disabled
- Message: "Please sign in to submit feedback — accounts help us prevent spam and follow up if needed."
- Sign In button that opens the existing auth flow

## Data Model

Add `Feedback` model to `amplify/data/resource.ts`:

```typescript
Feedback: a
  .model({
    category: a.enum(["general", "bug", "success"]),
    message: a.string().required(),
  })
  .authorization((allow) => [allow.owner()]),
```

This gives us: id, owner (auto from Cognito), category, message, createdAt, updatedAt — all automatic from Amplify.

## Files to Create/Modify

| File                                              | Action | Description                                                     |
| ------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `src/components/FeedbackModal.tsx`                | Create | Modal with category pills, textarea, submit logic               |
| `src/components/AppHeader.tsx`                    | Modify | Group Tour/Feedback/Sign In buttons, add Feedback click handler |
| `amplify/data/resource.ts`                        | Modify | Add Feedback model to schema                                    |
| `src/components/__tests__/FeedbackModal.test.tsx` | Create | Unit tests for modal states                                     |
| `src/components/__tests__/AppHeader.test.tsx`     | Modify | Update for new button group                                     |
| `README.md`                                       | Modify | Mention feedback feature                                        |
| `src/components/About.tsx`                        | Modify | Update changelog for next version                               |

## Auth Flow

- Uses existing Cognito auth from `useCloudSync` hook
- `isLoggedIn` prop passed from App.tsx through AppHeader
- Submit calls Amplify `client.models.Feedback.create({ category, message })`
- Owner field auto-populated by Amplify auth

## Portable Design

For open-source forks:

- Feedback model is part of the standard Amplify schema — anyone who deploys with `npx ampx sandbox` or Amplify hosting gets the table automatically
- No additional Lambda functions, API Gateway, or custom infrastructure
- If Amplify backend is not configured, the Feedback button can gracefully show "Feedback requires cloud backend" or similar

## Out of Scope

- Admin dashboard for viewing feedback (query DynamoDB directly)
- Public feedback feed or upvoting
- Anonymous submission
- Thumbs up/down on individual scenarios
- Email notifications on new feedback
