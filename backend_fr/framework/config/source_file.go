package config

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
)

// FileSource creates a configuration source that reads from a file.
// Supported formats: .json, .yaml, .yml, .toml.
func FileSource(path string) Source {
	return Source{
		name: fmt.Sprintf("file:%s", path),
		source: func(ctx context.Context) (map[string]any, error) {
			if err := validatePath(path); err != nil {
				return nil, errors.Wrapf(err, "invalid file path %q", path)
			}

			data, err := os.ReadFile(path)
			if err != nil {
				return nil, err
			}

			ext := strings.ToLower(filepath.Ext(path))
			return extUnmarshalling(ext, data)
		},
	}
}

func validatePath(path string) error {
	cleanPath := filepath.Clean(path)
	if strings.Contains(cleanPath, "..") {
		return errors.Errorf("path traversal detected: %q", cleanPath)
	}
	return nil
}

func extUnmarshalling(ext string, data []byte) (map[string]any, error) {
	var (
		result = make(map[string]any)
		err    error
	)
	if len(data) == 0 {
		return result, nil
	}

	switch ext {
	case ".json":
		err = json.Unmarshal(data, &result)
	case ".yaml", ".yml":
		err = yaml.Unmarshal(data, &result)
	case ".toml":
		err = toml.Unmarshal(data, &result)
	default:
		err = ErrInvalidFileFormat
	}

	return result, err
}
