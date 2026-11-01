#!/bin/bash
set -e

BASE_URL="http://localhost:3000/api/auth"

echo "🔹 Testing Auth API..."

# Register
echo "1️⃣ Register"
curl -s -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}'
echo -e "\n"

# Login
echo "2️⃣ Login"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}')
echo $LOGIN_RESPONSE | jq
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
echo

# Refresh token
echo "3️⃣ Refresh Token"
curl -s -X POST $BASE_URL/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq
echo

# Logout
echo "4️⃣ Logout"
curl -s -X POST $BASE_URL/logout \
  -H "Authorization: Bearer $REFRESH_TOKEN" | jq
echo

echo "✅ Testing complete!"
