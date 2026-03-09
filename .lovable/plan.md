
# Add "Single Pitch Analysis" Button to Top Navigation

## Problem
The main Single Pitch Analysis feature (the Index page) is not clearly accessible from the top navigation bar. Users can only enter the analysis feature by being on the homepage, but there's no button to navigate to it from other pages or to make it clear it's a primary feature.

## Solution
Add a "Single Pitch Analysis" button to the top navigation bar in `src/pages/Index.tsx` alongside Bulk Analysis, Comparison, History, Scoring Rubric, and Settings. This button will scroll to the main pitch input form when clicked, or navigate to "/" if the user is on another page.

## Implementation Details

### File: `src/pages/Index.tsx`

**What to change:**
1. Add a new import for `FileText` icon (already imported on line 8)
2. Create a ref for the main pitch input card (the "Input Pitch" section starting at line 563)
3. Add a "Single Pitch Analysis" button to the top navigation bar (around line 530, before the Compare button)
4. Add a scroll handler function that scrolls to the pitch input form when the button is clicked

**Button placement:**
- Insert as the **first button** in the top nav (line 530), before the Compare button
- Use `FileText` icon (already imported)
- Text: "Single Pitch Analysis"
- onClick handler: navigate to "/" if not already there, or scroll to the pitch input form if already on the page

**Technical approach:**
```text
1. Add useRef hook to create a ref for the pitch input card
2. In the button's onClick, check if user is on "/" page
   - If on "/", scroll to the ref using scrollIntoView()
   - If not on "/", navigate to "/"
3. Attach the ref to the Card element containing "Input Pitch"
```

## Files to Modify
- `src/pages/Index.tsx` -- add ref, add button to nav, add scroll handler

## Expected Result
- Top nav will have a "Single Pitch Analysis" button as the first/most prominent action button
- Clicking it from any page navigates to "/"
- Clicking it while already on "/" scrolls smoothly to the pitch input form
- Navigation order: Single Pitch Analysis | Compare | History | Bulk Analysis | Scoring Rubric | Settings | Logout
