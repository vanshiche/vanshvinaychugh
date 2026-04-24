# SRM Full Stack Engineering Challenge — BFHL Graph Hierarchy API

## Project Structure

```
full_stack/
├── backend/
│   ├── src/
│   │   ├── validator.js           # Edge string validation
│   │   ├── graphBuilder.js        # Adjacency list + Union-Find components
│   │   ├── cycleDetector.js       # DFS cycle detection per component
│   │   ├── treeBuilder.js         # Nested JSON tree + depth calculator
│   │   └── hierarchyProcessor.js  # Main orchestration pipeline
│   ├── server.js                  # Express entry point
│   ├── package.json
│   ├── Procfile                   # For Render/Railway
│   └── .gitignore
└── frontend/
    ├── index.html
    ├── style.css
    ├── app.js
    └── vercel.json
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev       # uses nodemon for hot reload
# OR
node server.js    # production start
```
Server runs at: `http://localhost:3000`

### Frontend
```bash
# From full_stack root:
npx serve frontend --listen 8080
```
Frontend runs at: `http://localhost:8080`

## API Reference

### POST /bfhl

**Request:**
```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

**Response:**
```json
{
  "user_id": "vickyvandan_24042004",
  "email_id": "vickyvandan@srm.edu.in",
  "college_roll_number": "RA2211003010462",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "A": { "B": { "D": {} }, "C": {} } },
      "depth": 3
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## Test Cases

See `backend/src/__tests__/` for full test coverage.

## Hosting

- **Backend**: Render.com → [render.yaml](render.yaml)
- **Frontend**: Vercel → push `/frontend` folder, set root to `frontend/`
