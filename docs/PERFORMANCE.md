# Performance Optimizations Documentation

This document explains the performance optimizations implemented to keep the app fast as data grows.

---

## Table of Contents
1. [Backend Pagination](#1-backend-pagination)
2. [Lazy Loading Routes](#2-lazy-loading-routes)
3. [Image Lazy Loading](#3-image-lazy-loading)
4. [Future Improvements](#4-future-improvements)

---

## 1. Backend Pagination

### What Changed
The `/api/expenses` endpoint now supports pagination to avoid loading all expenses at once.

### File Modified
`server/src/controllers/expenseController.ts`

### API Usage

```http
GET /api/expenses?page=1&limit=20
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page |
| `paginate` | boolean | true | Set to `false` to return array (legacy mode) |

### Response Format

**Paginated (default):**
```json
{
  "data": [
    { "id": "...", "description": "Groceries", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

**Legacy mode (`?paginate=false`):**
```json
[
  { "id": "...", "description": "Groceries", ... }
]
```

### Implementation Details

```typescript
// Pagination parameters
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 20;
const offset = (page - 1) * limit;

// Use findAndCountAll for count + data in one query
const { count, rows } = await Expense.findAndCountAll({
  ...queryOptions,
  limit,
  offset,
  distinct: true  // Important for correct count with JOINs
});

// Return with pagination metadata
res.json({
  data: rows,
  pagination: {
    page,
    limit,
    total: count,
    totalPages: Math.ceil(count / limit),
    hasMore: page < Math.ceil(count / limit)
  }
});
```

### Backward Compatibility
The AppContext uses `?paginate=false` to maintain the existing behavior where all expenses are loaded into state.

---

## 2. Lazy Loading Routes

### What Changed
Heavy pages are now loaded on-demand using `React.lazy()` instead of being bundled into the main JavaScript file.

### File Modified
`src/App.tsx`

### Pages Lazy Loaded
- Profile
- Settings
- ExpenseDetail
- UserProfile
- Reports (heavy - contains charts)
- Notifications
- Friends
- Purchases
- ForgotPassword

### Pages NOT Lazy Loaded (Core)
- Dashboard (index page - must load fast)
- Login / Signup (auth flow)
- Groups / GroupDetail (frequently accessed)
- AllExpenses (main listing)
- ExpenseForm (frequently accessed)

### Implementation

```tsx
import { Suspense, lazy } from 'react';

// Lazy loaded pages
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
// ... more lazy imports

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Wrap routes in Suspense
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/reports" element={<Reports />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Benefits
- **Smaller initial bundle**: Main bundle doesn't include code for rarely-visited pages
- **Faster first load**: User sees the dashboard faster
- **Code splitting**: Each lazy page becomes a separate chunk

---

## 3. Image Lazy Loading

### What Changed
Receipt images use the native `loading="lazy"` attribute.

### File Modified
`src/pages/ExpenseDetail.tsx`

### Implementation

```tsx
<img 
  src={expense.receipt} 
  alt="Receipt" 
  className="w-full rounded-md border shadow-sm" 
  loading="lazy"
/>
```

### Benefits
- Images only download when user scrolls them into view
- Saves bandwidth on pages with many images
- Native browser support (no JS library needed)

---

## 4. Future Improvements

### Infinite Scroll for Lists
Instead of loading all expenses, load 20 at a time as user scrolls:

```tsx
const loadMore = async () => {
  const res = await fetch(`/api/expenses?page=${page + 1}`);
  setExpenses(prev => [...prev, ...res.data]);
  setPage(p => p + 1);
};

// Use IntersectionObserver to detect scroll to bottom
```

### Pagination for Other APIs
- `GET /api/purchases?page=1&limit=30`
- `GET /api/notifications?page=1&limit=15`

### React Query for Caching
```tsx
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['expenses', page],
  queryFn: () => fetchExpenses(page),
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});
```

---

## Testing

### Test Pagination
```bash
curl "http://localhost:5001/api/expenses?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Lazy Loading
1. Open DevTools → Network tab
2. Navigate to Dashboard (should NOT load Reports.js)
3. Navigate to Reports page (should load Reports.js chunk)

### Test Image Lazy Loading
1. Open a long ExpenseDetail page with receipt
2. Check Network tab - image should load as you scroll to it
