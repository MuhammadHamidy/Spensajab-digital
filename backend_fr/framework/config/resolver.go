// Package config provides value resolvers for dynamic configuration values.
// Resolvers can fetch values from environment variables, files, base64 encoding,
// and external secret management systems like Vault.
//
// Resolvers are designed to be composable. The Resolve function applies them
// in sequence, allowing for complex resolution strategies (e.g., fetch from env,
// then decode base64).
//
// Example usage:
//
//	// Create resolvers
//	resolvers := []config.Resolver{
//		config.EnvResolver(),      // Resolves "env://VAR"
//		config.FileResolver(),     // Resolves "file:///path"
//		config.Base64Resolver(),   // Resolves "base64://VALUE"
//		config.VaultResolver(url, token, mount, ""),
//	}
//
//	// Apply to configuration
//	err := config.ReadInConfig(ctx, &cfg,
//		config.WithResolvers(resolvers...),
//	)
package config

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

// Resolver is a function that resolves dynamic configuration values.
// It takes a raw string value and returns the resolved value.
// Resolvers are used to fetch values from external sources like
// environment variables, files, or secret management systems.
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - raw: The raw value to resolve (e.g., "env://VAR")
//
// Returns:
//   - string: The resolved value
//   - error: Any error encountered during resolution. If the resolver does not
//     recognize the value scheme, it should return ErrInvalidResolver.
type Resolver func(ctx context.Context, raw string) (string, error)

// EnvResolver creates a resolver that fetches values from environment variables.
// It resolves values with the "env://" scheme.
//
// Examples:
//   - "env://DATABASE_URL" -> value of DATABASE_URL environment variable
//   - "env://API_KEY" -> value of API_KEY environment variable
//
// Returns:
//   - Resolver: A resolver that can be used with ReadInConfig
func EnvResolver() Resolver {
	const scheme = "env://"
	return func(ctx context.Context, raw string) (string, error) {
		if !strings.HasPrefix(raw, scheme) {
			return "", ErrInvalidResolver
		}

		// Check context before proceeding
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		raw = strings.TrimPrefix(raw, scheme)
		if raw == "" {
			return "", NewValidationError("env", "environment variable name cannot be empty", nil)
		}

		// Validate environment variable name
		if err := validateEnvVarName(raw); err != nil {
			return "", errors.Wrapf(err, "invalid environment variable name %q", raw)
		}

		val, ok := os.LookupEnv(raw)
		if !ok {
			return "", NewSourceError(fmt.Sprintf("env://%s", raw),
				errors.New("environment variable not found"))
		}

		return val, nil
	}
}

// FileResolver creates a resolver that reads values from files.
// It resolves values with the "file://" scheme.
//
// Examples:
//   - "file:///etc/secrets/api.key" -> contents of /etc/secrets/api.key
//   - "file://./config/private.pem" -> contents of ./config/private.pem
//
// Returns:
//   - Resolver: A resolver that can be used with ReadInConfig
//
// Security Note:
// The path is validated to prevent directory traversal attacks.
// Only files within local paths are generally allowed, depending on validation logic.
func FileResolver() Resolver {
	const scheme = "file://"
	return func(ctx context.Context, raw string) (string, error) {
		if !strings.HasPrefix(raw, scheme) {
			return "", ErrInvalidResolver
		}

		// Check context before proceeding
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		raw = strings.TrimPrefix(raw, scheme)
		if raw == "" {
			return "", NewValidationError("path", "file path cannot be empty", nil)
		}

		// Validate path to prevent directory traversal
		if err := validateResolverPath(raw); err != nil {
			return "", errors.Wrapf(err, "invalid file path %q", raw)
		}

		data, err := os.ReadFile(raw)
		if err != nil {
			if os.IsNotExist(err) {
				return "", NewSourceError(fmt.Sprintf("file://%s", raw), ErrNotFound)
			}

			return "", NewSourceError(fmt.Sprintf("file://%s", raw),
				errors.Wrapf(err, "failed to read file"))
		}

		return strings.TrimRight(string(data), "\r\n"), nil
	}
}

// Base64Resolver creates a resolver that decodes base64-encoded values.
// It resolves values with the "base64://" scheme.
//
// Examples:
//   - "base64://SGVsbG8gV29ybGQ=" -> "Hello World"
//   - "base64://c2VjcmV0LXRva2Vu" -> "secret-token"
//
// Returns:
//   - Resolver: A resolver that can be used with ReadInConfig
func Base64Resolver() Resolver {
	const scheme = "base64://"
	return func(ctx context.Context, raw string) (string, error) {
		if !strings.HasPrefix(raw, scheme) {
			return "", ErrInvalidResolver
		}

		// Check context before proceeding
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		raw = strings.TrimPrefix(raw, scheme)
		if raw == "" {
			return "", NewValidationError("base64", "base64 data cannot be empty", nil)
		}

		data, err := base64.StdEncoding.DecodeString(raw)
		if err != nil {
			return "", NewConfigError("base64 decode",
				errors.Wrapf(err, "failed to decode base64 data"))
		}

		return string(data), nil
	}
}

// VaultResolver creates a resolver that fetches secrets from HashiCorp Vault.
// It resolves values with the "vault://" scheme and returns JSON-encoded secrets.
//
// Parameters:
//   - url: Vault server URL (e.g., "https://vault:8200")
//   - token: Vault authentication token
//   - mountPath: Vault secrets engine mount path (e.g., "secret")
//   - vaultPath: Base path for secrets (can be empty if secrets are at root)
//
// Examples:
//   - "vault://database" -> JSON secret from secret/data/database
//   - "vault://api/keys" -> JSON secret from secret/data/api/keys
//
// Returns:
//   - Resolver: A resolver that can be used with ReadInConfig
//
// Note:
// The resolver returns the JSON representation of the secret from Vault.
// The key is extracted from the portion of the string after "vault://".
func VaultResolver(url, token, mountPath, vaultPath string) Resolver {
	const scheme = "vault://"
	client := VaultClient(url, token, mountPath)
	return func(ctx context.Context, raw string) (string, error) {
		if !strings.HasPrefix(raw, scheme) {
			return "", ErrInvalidResolver
		}

		// Extract the key from raw input, not from the vaultPath parameter
		raw = strings.TrimPrefix(raw, scheme)
		if raw == "" {
			return "", ErrInvalidPath
		}

		// Use the extracted key (raw), not the vaultPath parameter
		key, err := client(ctx, raw)
		if err != nil {
			return "", errors.Wrapf(err, "failed to fetch from vault for key %q", raw)
		}

		rawVal, err := json.Marshal(key)
		if err != nil {
			return "", errors.Wrapf(err, "failed to marshal vault key %q", raw)
		}

		return string(rawVal), nil
	}
}

// validateResolverPath ensures the resolver file path is safe
func validateResolverPath(path string) error {
	// Clean the path to resolve any .. or . components
	cleanPath := filepath.Clean(path)

	// Check for directory traversal attempts
	if strings.Contains(cleanPath, "..") {
		return errors.New("path traversal detected in resolver")
	}

	return nil
}

// validateEnvVarName ensures the environment variable name is valid
func validateEnvVarName(name string) error {
	if name == "" {
		return errors.New("environment variable name cannot be empty")
	}

	// Basic validation - check for invalid characters
	for _, r := range name {
		if !((r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '_') {
			return errors.Errorf("invalid character %q in environment variable name", r)
		}
	}

	// Cannot start with a digit
	if name[0] >= '0' && name[0] <= '9' {
		return errors.New("environment variable name cannot start with a digit")
	}

	return nil
}

// Resolve applies resolvers to a raw configuration value.
// It iterates through the provided resolvers in order. The first resolver
// that recognizes the scheme (does not return ErrInvalidResolver) attempts
// to resolve the value.
//
// If a resolver succeeds, its result becomes the new value. The loop continues,
// allowing for chained resolution (e.g. env://VAR -> base64://... -> value).
//
// Parameters:
//   - ctx: Context for cancellation and timeouts
//   - raw: The raw configuration value to resolve
//   - resolvers: List of resolvers to apply in order
//
// Returns:
//   - string: The resolved value
//   - error: Any error encountered during resolution
func Resolve(ctx context.Context, raw string, resolvers ...Resolver) (string, error) {
	// Defensive check: if no resolvers provided, return raw value
	if len(resolvers) == 0 {
		return raw, nil
	}

	// Check context at the beginning
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	var lastErr error
	for i, resolver := range resolvers {
		// Check context before each resolver
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		str, err := resolver(ctx, raw)
		if err != nil {
			if errors.Is(err, ErrInvalidResolver) {
				continue
			}

			// Wrap error with resolver index for better debugging
			return "", errors.Wrapf(err, "resolver %d failed", i)
		}

		// Successfully resolved, update raw and continue
		// This allows piping: output of one resolver becomes input of next
		raw = str
		lastErr = nil
	}

	// If we have a last error but it was ErrInvalidResolver, that's OK
	// It just means no resolvers matched the pattern (or the last one didn't)
	if lastErr != nil && !errors.Is(lastErr, ErrInvalidResolver) {
		return "", lastErr
	}

	return raw, nil
}
