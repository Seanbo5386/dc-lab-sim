# Google OAuth Setup Guide

This guide walks through adding "Continue with Google" sign-in to the Data Center Lab Simulator.

## Prerequisites

- AWS Amplify Gen 2 backend deployed
- Google Cloud account with billing enabled

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Name it (e.g., `dc-lab-simulator`) and click **Create**

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: `Data Center Lab Simulator`
   - User support email: your email
   - Authorized domains: your production domain (e.g., `yourdomain.com`)
   - Developer contact email: your email
4. Add scopes: `email`, `profile`, `openid`
5. Click **Save and Continue**

## Step 3: Create OAuth 2.0 Client ID

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `DC Lab Simulator`
5. Add **Authorized redirect URIs**:
   - Development: `https://localhost:5173/` (or your dev port)
   - Sandbox: `https://<sandbox-domain>/`
   - Production: `https://<production-domain>/`
   - Cognito callback: `https://<your-user-pool-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
6. Click **Create** and note the **Client ID** and **Client Secret**

## Step 4: Store Secrets in Amplify Sandbox

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
# Paste your Google Client ID when prompted

npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
# Paste your Google Client Secret when prompted
```

For production, set these in your CI/CD pipeline or Amplify console environment variables.

## Step 5: Update Amplify Auth Configuration

Edit `amplify/auth/resource.ts`:

```typescript
import { defineAuth, secret } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email", "profile", "openid"],
      },
      callbackUrls: [
        "http://localhost:5173/",
        "https://your-production-domain.com/",
      ],
      logoutUrls: [
        "http://localhost:5173/",
        "https://your-production-domain.com/",
      ],
    },
  },
});
```

## Step 6: Add UI Button in UserMenu

Add a "Continue with Google" button above the email/password form in `src/components/UserMenu.tsx`:

```tsx
import { signInWithRedirect } from "aws-amplify/auth";

// Inside the signIn view, before the email input:
<button
  type="button"
  onClick={() => signInWithRedirect({ provider: "Google" })}
  className="w-full py-2 bg-white text-gray-800 text-sm font-semibold rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
>
  <GoogleIcon /> {/* Add Google "G" logo SVG */}
  Continue with Google
</button>
<div className="flex items-center gap-2 text-xs text-gray-500">
  <div className="flex-1 h-px bg-gray-700" />
  or
  <div className="flex-1 h-px bg-gray-700" />
</div>
```

## Verification

1. Run `npx ampx sandbox` to deploy the updated backend
2. Open the app and click "Sign in"
3. Click "Continue with Google" — should redirect to Google consent screen
4. After consent, user should be redirected back and signed in
