package main

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/golang-jwt/jwt/v4"
)

// JWKS represents the JSON Web Key Set structure
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// JWK represents a single JSON Web Key
type JWK struct {
	Kid string `json:"kid"` // Key ID
	Kty string `json:"kty"` // Key Type (OKP for Ed25519)
	Alg string `json:"alg"` // Algorithm (EdDSA)
	Use string `json:"use"` // Public Key Use
	Crv string `json:"crv"` // Curve (Ed25519)
	X   string `json:"x"`   // Public key value
}

// FetchJWKS fetches the JWKS from the specified URL
func FetchJWKS(url string) (*JWKS, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var jwks JWKS
	if err := json.Unmarshal(body, &jwks); err != nil {
		return nil, fmt.Errorf("failed to parse JWKS: %w", err)
	}

	return &jwks, nil
}

// GetPublicKey converts a JWK to an Ed25519 public key
func (jwk *JWK) GetPublicKey() (ed25519.PublicKey, error) {
	if jwk.Kty != "OKP" || jwk.Crv != "Ed25519" {
		return nil, fmt.Errorf("unsupported key type: kty=%s, crv=%s", jwk.Kty, jwk.Crv)
	}

	// Decode the x coordinate (public key) from hex
	pubKeyBytes, err := hex.DecodeString(jwk.X)
	if err != nil {
		return nil, fmt.Errorf("failed to decode public key: %w", err)
	}

	if len(pubKeyBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key size: got %d, want %d", len(pubKeyBytes), ed25519.PublicKeySize)
	}

	return ed25519.PublicKey(pubKeyBytes), nil
}

// FindKey finds a key in JWKS by its kid
func (jwks *JWKS) FindKey(kid string) *JWK {
	for _, key := range jwks.Keys {
		if key.Kid == kid {
			return &key
		}
	}
	return nil
}

// ParseTokenWithJWKS parses and validates a JWT token using JWKS
func ParseTokenWithJWKS(tokenString, jwksURL string) (*jwt.Token, error) {
	// Fetch JWKS
	jwks, err := FetchJWKS(jwksURL)
	if err != nil {
		return nil, err
	}

	// Parse token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method is EdDSA
		if _, ok := token.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Get the kid from token header
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid not found in token header")
		}

		// Find the matching key in JWKS
		jwk := jwks.FindKey(kid)
		if jwk == nil {
			return nil, fmt.Errorf("key with kid '%s' not found in JWKS", kid)
		}

		// Convert JWK to Ed25519 public key
		return jwk.GetPublicKey()
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	return token, nil
}

func main() {
	// Your JWT token
	tokenString := "eyJhbGciOiJFZERTQSIsImtpZCI6ImtpZF83NzQzOGRhZCIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjUzNjQ3NzQsImlhdCI6MTc2NTM2Mzg3NCwiaW5zdGl0dXRpb25faWQiOiIyZDI1YTM4My0zYzMzLTRlMjktYTViYS02NDk1NzQ3ZDY0NzciLCJqdGkiOiJraWRfZjhlOWQ4ODIiLCJyb2xlX2lkIjpbXSwic3ViIjoiMjE2MTA1IiwidHlwZSI6ImFjY2VzcyJ9.BZ4m2wmrBM58e0y63L8wglkq8biKcvVgppt_h367w2pefjvGqE0nWmIAAFsuGwZGQaBCX5_Hiwtb3yEf1qgQAQ"

	// Your local JWKS server URL
	jwksURL := "http://localhost:8081/.well-known/jwks.json"

	// Parse and validate the token
	token, err := ParseTokenWithJWKS(tokenString, jwksURL)
	if err != nil {
		log.Fatalf("Error parsing token: %v", err)
	}

	// Check if token is valid
	if !token.Valid {
		log.Fatal("Token is invalid")
	}

	// Extract claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		fmt.Println("Token is valid!")
		fmt.Println("Claims:")
		for key, value := range claims {
			fmt.Printf("  %s: %v\n", key, value)
		}
	}
}
