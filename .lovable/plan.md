
# Add Recent Analyses Section to Compare Startups Page

## Overview

This plan adds a "Recent Analyses" section to the Compare Startups page, positioned below the startup input cards (Startup A, Startup B, etc.). This allows users to quickly access their saved comparison analyses without navigating to the History page.

## Current State

- The Compare page (`/compare`) currently has:
  - Header with navigation and action buttons
  - Startup pitch input cards (A, B, etc.)
  - Comparison results table
  - A "History" button in the header that navigates to `/history`
  
- There is NO Recent Analyses section on this page
- Users must go to `/history` to see past comparisons

## Proposed Solution

Add a "Recent Comparisons" card section at the bottom of the Compare page that:
1. Fetches and displays the user's most recent comparison analyses
2. Allows clicking to load a saved comparison back into the page
3. Matches the styling of the Recent Analyses section on the Index page

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Compare Startups Header                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Startup A                                       │   │
│  │  [Pitch text area...]                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Startup B                                       │   │
│  │  [Pitch text area...]                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📊 Comparison Table                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │  <-- NEW
│  │  🕐 Recent Comparisons                           │   │
│  │                                                  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ Startup A vs B vs C       Jan 15, 2026   │  │   │
│  │  │ Click to load comparison                  │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ TechCorp vs DataInc       Jan 10, 2026   │  │   │
│  │  │ Click to load comparison                  │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Changes Required

### 1. Update Compare.tsx

**Add State and Data Fetching:**
- Add `recentComparisons` state to store fetched history
- Create `loadRecentComparisons()` function to fetch from `comparison_analyses` table
- Call this function on component mount when user is authenticated
- Limit to most recent 5 comparisons

**Add Load History Function:**
- Create `loadHistoricalComparison()` function that:
  - Populates the pitch slots with saved data
  - Restores analyses for each startup
  - Restores comparison insights
  - Shows toast notification confirming load

**Add UI Section:**
- Add a Card section below the comparison table or startup input cards
- Display recent comparisons with:
  - Startup names as badges
  - Date created
  - Click to load functionality
- Style consistently with the Index page's Recent Analyses section

## Technical Details

### Interface for Recent Comparisons

```typescript
interface RecentComparison {
  id: string;
  created_at: string;
  startup_names: string[];
  pitches: string[];
  analyses: AnalysisResult[];
  comparison_insights: any;
}
```

### Fetching Recent Comparisons

```typescript
const loadRecentComparisons = async () => {
  if (!user) return;
  
  const { data, error } = await supabase
    .from("comparison_analyses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);
    
  if (!error && data) {
    setRecentComparisons(data);
  }
};
```

### Loading a Historical Comparison

```typescript
const loadHistoricalComparison = (comparison: RecentComparison) => {
  // Restore pitch slots from saved data
  const restoredPitches: PitchSlot[] = comparison.startup_names.map((name, index) => ({
    id: index + 1,
    name: name,
    text: comparison.pitches[index] || "",
    analysis: comparison.analyses[index] || null,
    loading: false,
  }));
  
  setPitches(restoredPitches);
  setComparisonInsights(comparison.comparison_insights);
  
  toast({
    title: "Comparison Loaded",
    description: `Loaded comparison from ${new Date(comparison.created_at).toLocaleDateString()}`,
  });
};
```

### UI Component

```text
<Card className="p-8 bg-card border-border shadow-lg mt-6">
  <div className="flex items-center gap-3 mb-6">
    <History className="h-6 w-6 text-primary" />
    <h2 className="text-2xl font-bold text-foreground">Recent Comparisons</h2>
  </div>

  {recentComparisons.length === 0 ? (
    <p className="text-muted-foreground text-center py-8">
      No saved comparisons yet. Save one to see it here!
    </p>
  ) : (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {recentComparisons.map((comparison) => (
        <Card
          key={comparison.id}
          className="p-4 cursor-pointer hover:bg-secondary/50 transition-all"
          onClick={() => loadHistoricalComparison(comparison)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-wrap gap-2">
              {comparison.startup_names.map((name, idx) => (
                <Badge key={idx} variant="secondary">{name}</Badge>
              ))}
            </div>
            <Badge variant="outline" className="ml-2 shrink-0">
              {new Date(comparison.created_at).toLocaleDateString()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Click to load comparison
          </p>
        </Card>
      ))}
    </div>
  )}
</Card>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Compare.tsx` | Add state, fetching, load function, and UI for recent comparisons |

## User Flow

1. User navigates to Compare Startups page
2. Recent Comparisons section loads and displays past saved comparisons
3. User clicks on a past comparison
4. The page populates:
   - All pitch text areas with saved content
   - All analysis results for each startup
   - The comparison insights section
5. User sees a toast confirmation: "Comparison Loaded"
6. User can continue editing or export the loaded comparison

## Considerations

- **Limit to 5**: Only show the 5 most recent comparisons to keep the UI clean
- **Loading State**: Show spinner while fetching recent comparisons
- **Empty State**: Display friendly message when no comparisons exist
- **Refresh After Save**: After saving a new comparison, refresh the recent comparisons list
