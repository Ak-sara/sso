#!/bin/bash

# SCIM 2.0 API Testing Script
# Tests all SCIM endpoints with Bearer token authentication

BASE_URL="http://localhost:5173"
SCIM_TOKEN="scim-token-12345"

echo "🧪 Testing SCIM 2.0 API Endpoints"
echo "=================================="
echo ""

# Test 1: GET /scim/v2/Users (List all users)
echo "📋 Test 1: GET /scim/v2/Users (List all users)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Users?startIndex=1&count=10" \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Test 2: GET /scim/v2/Users with filter
echo "📋 Test 2: GET /scim/v2/Users with filter"
curl -s -X GET \
  "$BASE_URL/scim/v2/Users?filter=active%20eq%20%22true%22" \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Get first user ID for subsequent tests
USER_ID=$(curl -s -X GET \
  "$BASE_URL/scim/v2/Users?count=1" \
  -H "Authorization: Bearer $SCIM_TOKEN" | jq -r '.Resources[0].id')

echo "Using User ID: $USER_ID"
echo ""

# Test 3: GET /scim/v2/Users/{id} (Get single user)
echo "📋 Test 3: GET /scim/v2/Users/$USER_ID (Get single user)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Users/$USER_ID" \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Test 4: GET /scim/v2/Groups (List all groups/org units)
echo "📋 Test 4: GET /scim/v2/Groups (List all org units)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Groups?startIndex=1&count=10" \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Get first group ID for subsequent tests
GROUP_ID=$(curl -s -X GET \
  "$BASE_URL/scim/v2/Groups?count=1" \
  -H "Authorization: Bearer $SCIM_TOKEN" | jq -r '.Resources[0].id')

echo "Using Group ID: $GROUP_ID"
echo ""

# Test 5: GET /scim/v2/Groups/{id} (Get single group)
echo "📋 Test 5: GET /scim/v2/Groups/$GROUP_ID (Get single group)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Groups/$GROUP_ID" \
  -H "Authorization: Bearer $SCIM_TOKEN" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Test 6: Test authentication failure (no token)
echo "🔒 Test 6: Test authentication failure (no token)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Users" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "---"
echo ""

# Test 7: Test authentication failure (invalid token)
echo "🔒 Test 7: Test authentication failure (invalid token)"
curl -s -X GET \
  "$BASE_URL/scim/v2/Users" \
  -H "Authorization: Bearer invalid-token-xyz" \
  -H "Content-Type: application/scim+json" | jq '.'

echo ""
echo "=================================="
echo "✅ SCIM API Testing Complete!"
echo ""
echo "Summary of tested endpoints:"
echo "  ✓ GET /scim/v2/Users"
echo "  ✓ GET /scim/v2/Users?filter=..."
echo "  ✓ GET /scim/v2/Users/{id}"
echo "  ✓ GET /scim/v2/Groups"
echo "  ✓ GET /scim/v2/Groups/{id}"
echo "  ✓ Authentication (Bearer token)"
echo ""
