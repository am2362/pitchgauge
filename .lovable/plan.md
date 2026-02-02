

# Settings Page with Personal Profile Management

## Overview

This plan adds a comprehensive **Settings page** where users can manage their personal profile, including:
- Editing their display name
- Changing their email address
- Creating or changing their password

The implementation leverages the existing `profiles` table and Supabase Auth APIs.

## Architecture Flow

```text
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  Settings Page  │───▶│  Profile Section │───▶│  profiles table   │
│  /settings      │    │  - Display Name  │    │  (full_name)      │
└─────────────────┘    │  - Avatar (view) │    └───────────────────┘
                       └──────────────────┘
                              │
                       ┌──────────────────┐    ┌───────────────────┐
                       │  Email Section   │───▶│  Supabase Auth    │
                       │  - Change Email  │    │  updateUser()     │
                       └──────────────────┘    └───────────────────┘
                              │
                       ┌──────────────────┐    ┌───────────────────┐
                       │ Password Section │───▶│  Supabase Auth    │
                       │  - New Password  │    │  updateUser()     │
                       │  - Confirm       │    └───────────────────┘
                       └──────────────────┘
```

## Changes Required

### 1. Create Settings Page (`src/pages/Settings.tsx`)

A new page with three main sections in a tabbed or card-based layout:

**Profile Section:**
- Load current profile data from `profiles` table
- Editable display name field
- Show current email (read-only display)
- Save button to update `profiles.full_name`

**Email Section:**
- Input field for new email address
- Confirmation of current password (security measure)
- "Update Email" button using `supabase.auth.updateUser({ email })`
- Note: User will receive confirmation email to both old and new addresses

**Password Section:**
- Current password field (for verification - optional UX improvement)
- New password field with validation (min 6 characters)
- Confirm new password field
- "Update Password" button using `supabase.auth.updateUser({ password })`

### 2. Add Route to App.tsx

Register the new `/settings` route in the router configuration.

### 3. Add Settings Link to Navigation

Add a Settings button/link in the header of the main Index page (next to the existing Logout button).

### 4. Update Profile Data on Email Change

When email is updated via Supabase Auth, also update the `profiles.email` column to keep them in sync.

## UI Design

The settings page will follow the existing app design patterns:
- Gradient background matching other pages
- Card-based sections for each settings category
- Consistent button styling
- Toast notifications for success/error feedback
- Loading states during API calls

**Page Layout:**
```text
┌────────────────────────────────────────────────────────┐
│  ← Back                     Settings                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  👤 Profile                                      │   │
│  │                                                  │   │
│  │  Display Name: [________________]                │   │
│  │                                                  │   │
│  │  Email: user@example.com (read-only)            │   │
│  │                                                  │   │
│  │                          [Save Changes]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✉️ Change Email                                 │   │
│  │                                                  │   │
│  │  New Email: [________________]                   │   │
│  │                                                  │   │
│  │  A confirmation link will be sent to both       │   │
│  │  your current and new email addresses.          │   │
│  │                                                  │   │
│  │                           [Update Email]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔒 Change Password                              │   │
│  │                                                  │   │
│  │  New Password: [________________]                │   │
│  │  Confirm Password: [________________]            │   │
│  │  (Must be at least 6 characters)                │   │
│  │                                                  │   │
│  │                        [Update Password]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Technical Details

### Profile Update Logic

```typescript
// Update display name in profiles table
const { error } = await supabase
  .from('profiles')
  .update({ full_name: displayName })
  .eq('id', user.id);
```

### Email Update Flow

1. User enters new email
2. Call `supabase.auth.updateUser({ email: newEmail })`
3. Supabase sends confirmation to both old and new email
4. User must confirm from new email to complete change
5. After confirmation, update `profiles.email` to keep in sync

### Password Update Logic

```typescript
// Update password
const { error } = await supabase.auth.updateUser({
  password: newPassword
});
```

### Validation

- Display name: Required, max 100 characters
- Email: Valid email format (using Zod)
- Password: Minimum 6 characters, must match confirmation

### Error Handling

- Show toast notifications for all outcomes
- Handle Supabase-specific errors (e.g., "Email already in use")
- Disable form during loading states
- Clear sensitive fields after submission

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Settings.tsx` | Create | New settings page with profile, email, and password sections |
| `src/App.tsx` | Modify | Add `/settings` route |
| `src/pages/Index.tsx` | Modify | Add Settings button to header navigation |

## Security Considerations

- All profile updates respect existing RLS policies (users can only update their own profile)
- Password is never displayed, only updated
- Email change requires confirmation from both addresses (Supabase built-in)
- Form inputs are validated client-side before submission

