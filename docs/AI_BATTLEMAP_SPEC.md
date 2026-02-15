# AI Battle Map Generation Specification

## Overview
Generate AI-powered battle maps using DALL-E 3 via OpenRouter for vttless TTRPG platform.

## Architecture
[ASCII diagram or description of: User → Frontend → Backend → OpenRouter → DALL-E → S3 → Frontend]

## Backend API Endpoints

### POST /maps/generate-ai
Generate new AI battle map

**Request Body:**
```json
{
  "prompt": "string",           // User's description
  "style": "fantasy|scifi|modern|dungeon", // Visual style
  "gridEnabled": true,          // Show grid overlay
  "dimensions": "30x40"         // Grid size in squares
}
```

**Response:**
```json
{
  "mapId": "string",
  "status": "generating|completed|failed",
  "previewUrl": "string",
  "estimatedCost": 0.04
}
```

## OpenRouter Integration
- Model: `openai/dall-e-3`
- Endpoint: POST to OpenRouter image generation API
- Cost: ~$0.02-0.04 per image
- Authentication: OPENROUTER_API_KEY env variable

## Prompt Engineering Template
Base: "Top-down battle map for tabletop RPG, 5-foot grid spacing, {terrain}, {lighting}, {style}, highly detailed, game-ready"

## Database Schema
Add to Map model:
- aiGenerated: Boolean
- aiPrompt: String
- aiStyle: String
- generationCost: Number
- imageUrl: String (S3 URL)

## Frontend Components
- AIMapGenerator.jsx - Modal with prompt input, style selector, grid toggle
- CostDisplay - Shows estimated cost ($0.02-0.04)
- PreviewPane - Shows generated image with grid overlay

## Implementation Phases
Phase 1: Backend API + OpenRouter integration (1-2 days)
Phase 2: Frontend UI components (1-2 days)
Phase 3: Grid overlay system (1 day)
Phase 4: Testing & refinement (1 day)

## Cost Management
- Track per-user generation costs
- Rate limit: 5 maps/hour per user
- Optional: Credit system for premium users
