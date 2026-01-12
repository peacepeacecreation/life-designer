#!/bin/bash

echo "🧪 Тестування створення цілі через API..."
echo ""

# Test creating a goal
curl -s -X POST \
  "http://localhost:3077/api/goals" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.test-cookie 2>/dev/null || echo '')" \
  -d '{
    "name": "Test Goal",
    "description": "Test description",
    "category": "work",
    "priority": "high",
    "status": "not-started",
    "timeAllocated": 0,
    "progressPercentage": 0,
    "startDate": "2026-01-12T00:00:00.000Z",
    "targetEndDate": "2026-02-12T00:00:00.000Z",
    "tags": []
  }' | jq .

echo ""
