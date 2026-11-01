package object

import (
	"errors"
	"reflect"
	"strings"
)

var ErrInvalidType = errors.New("invalid type")

const (
	TagObject = "object"
	TagDB     = "db"
)

// ParseAll maps a slice of source structs to a slice of destination structs based on matching tags.
// It iterates over the input slice and calls Parse for each element.
// srcTag is the tag name to look for in the source struct (e.g., "db").
// dstTag is the tag name to look for in the destination struct (e.g., "json").
func ParseAll[T any, D any](srcTag, dstTag string, src []T) ([]D, error) {
	results := make([]D, 0, len(src))
	for _, s := range src {
		result, err := Parse[T, D](srcTag, dstTag, s)
		if err != nil {
			return nil, err
		}

		results = append(results, result)
	}

	return results, nil
}

// Parse maps fields from src to a new instance of D based on matching tags.
// srcTag is the tag name to look for in the source struct (e.g., "db").
// dstTag is the tag name to look for in the destination struct (e.g., "json").
// D can be a struct or a pointer to a struct.
func Parse[T any, D any](srcTag, dstTag string, src T) (D, error) {
	var zero D

	// 1. Analyze Source
	srcVal := reflect.ValueOf(src)
	if srcVal.Kind() == reflect.Ptr {
		srcVal = srcVal.Elem()
	}
	if srcVal.Kind() != reflect.Struct {
		return zero, ErrInvalidType
	}
	srcType := srcVal.Type()

	// 2. Analyze Destination Type
	dstTypeFull := reflect.TypeFor[D]()
	dstTypeStruct := dstTypeFull
	if dstTypeStruct.Kind() == reflect.Ptr {
		dstTypeStruct = dstTypeStruct.Elem()
	}
	if dstTypeStruct.Kind() != reflect.Struct {
		return zero, ErrInvalidType
	}

	// 3. Create Destination Instance
	// Create a pointer to the struct to ensure it's addressable
	dstPtr := reflect.New(dstTypeStruct)
	dstVal := dstPtr.Elem()

	// 4. Map Fields
	for i := 0; i < srcType.NumField(); i++ {
		srcField := srcType.Field(i)
		srcTagVal := getTagValue(srcField.Tag.Get(srcTag))
		if srcTagVal == "" || srcTagVal == "-" {
			continue
		}

		for j := 0; j < dstTypeStruct.NumField(); j++ {
			dstField := dstTypeStruct.Field(j)
			dstTagVal := getTagValue(dstField.Tag.Get(dstTag))

			if dstTagVal == "" || dstTagVal == "-" {
				continue
			}

			// KEY FIX: Verify tags match
			if srcTagVal != dstTagVal {
				continue
			}

			targetField := dstVal.Field(j)
			if !targetField.CanSet() {
				continue
			}

			// Assign value if types are compatible
			srcFieldVal := srcVal.Field(i)
			if targetField.Type() == srcFieldVal.Type() {
				targetField.Set(srcFieldVal)
			}
		}
	}

	// 5. Return result
	if dstTypeFull.Kind() == reflect.Ptr {
		return dstPtr.Interface().(D), nil
	}
	return dstVal.Interface().(D), nil
}

// getTagValue extracts the name part of a tag (before the first comma).
func getTagValue(tag string) string {
	if idx := strings.Index(tag, ","); idx != -1 {
		return tag[:idx]
	}
	return tag
}
