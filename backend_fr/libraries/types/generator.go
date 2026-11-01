package types

import (
	"crypto/rand"
	"encoding/hex"
	"strings"

	"github.com/google/uuid"
)

func GenerateID() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return strings.ReplaceAll(uuid.NewString(), "-", "")
	}

	return hex.EncodeToString(b)
}
