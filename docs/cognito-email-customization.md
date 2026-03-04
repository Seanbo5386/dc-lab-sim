# Cognito Email Customization Guide

This guide explains how to customize the verification and password reset emails sent by Amazon Cognito.

## Overview

By default, Cognito sends plain-text emails for:

- Account verification (sign-up confirmation code)
- Password reset codes
- Email change verification

You can customize these via the AWS Console or Amplify configuration.

## Option 1: AWS Console (Quick)

### Customize Verification Email

1. Open [Amazon Cognito Console](https://console.aws.amazon.com/cognito/)
2. Select your User Pool
3. Navigate to **Messaging** > **Message templates**
4. Click **Edit** on the verification message
5. Configure:
   - **Email subject**: `Verify your Data Center Lab Simulator account`
   - **Email body** (HTML):
   ```html
   <div
     style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;"
   >
     <div
       style="background: #1a1a2e; border-radius: 12px; padding: 32px; color: #e0e0e0;"
     >
       <div
         style="height: 4px; background: #76B900; border-radius: 2px; margin-bottom: 24px;"
       ></div>
       <h1 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">
         Welcome to DC Lab Simulator
       </h1>
       <p style="margin: 0 0 24px; line-height: 1.6;">
         Your verification code is:
       </p>
       <div
         style="background: #0d0d1a; border: 1px solid #333; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;"
       >
         <span
           style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #76B900;"
           >{####}</span
         >
       </div>
       <p style="margin: 0; font-size: 14px; color: #888;">
         This code expires in 24 hours. If you didn't create an account, ignore
         this email.
       </p>
     </div>
   </div>
   ```
6. Click **Save changes**

### Customize Password Reset Email

1. Same Cognito Console > **Message templates**
2. Edit the **Forgot password** message
3. Use similar HTML template, replacing the heading:
   - Subject: `Reset your Data Center Lab Simulator password`
   - Heading: `Password Reset Request`
   - Body text: `Use this code to reset your password:`

## Option 2: Amplify Backend (Infrastructure as Code)

In Amplify Gen 2, you can customize email templates in `amplify/auth/resource.ts`. However, full HTML email customization requires a Lambda trigger:

1. Create a custom message Lambda trigger
2. Reference it in your auth configuration

See [Amplify docs on custom email](https://docs.amplify.aws/gen2/build-a-backend/auth/customize-auth-emails/) for the latest approach.

## Using Amazon SES for Production

By default, Cognito uses a built-in email sender limited to 50 emails/day. For production:

1. Set up [Amazon SES](https://console.aws.amazon.com/ses/)
2. Verify your sending domain
3. Move out of SES sandbox (request production access)
4. Configure Cognito to use SES:
   - User Pool > **Messaging** > **Email** > **Edit**
   - Select **Send email with Amazon SES**
   - Enter your verified SES email address

This removes the 50/day limit and enables custom FROM addresses.

## Template Variables

| Variable             | Description                                        |
| -------------------- | -------------------------------------------------- |
| `{####}`             | Verification/reset code (when using code delivery) |
| `{##Verify Email##}` | Verification link (when using link delivery)       |
| `{username}`         | User's email/username                              |

## Testing

1. Sign up with a new email in the sandbox environment
2. Check inbox for the customized verification email
3. Test "Forgot password?" flow and verify the reset email template
