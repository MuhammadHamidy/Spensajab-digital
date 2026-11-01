package object

import (
	"testing"
)

type Source struct {
	ID   string `db:"id"`
	Name string `db:"name"`
	Age  int    `db:"age"`
	Ign  string `db:"-"`
}

type Dest struct {
	UID   string `json:"id"`
	Title string `json:"name"`
	Years int    `json:"age"`
}

func TestParse(t *testing.T) {
	src := Source{
		ID:   "user-1",
		Name: "Alice",
		Age:  30,
		Ign:  "ignore",
	}

	t.Run("Parse to Struct", func(t *testing.T) {
		res, err := Parse[Source, Dest]("db", "json", src)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res.UID != "user-1" {
			t.Errorf("expected UID 'user-1', got '%s'", res.UID)
		}
		if res.Title != "Alice" {
			t.Errorf("expected Title 'Alice', got '%s'", res.Title)
		}
		if res.Years != 30 {
			t.Errorf("expected Years 30, got %d", res.Years)
		}
	})

	t.Run("Parse to Pointer", func(t *testing.T) {
		res, err := Parse[Source, *Dest]("db", "json", src)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if res == nil {
			t.Fatal("expected result not to be nil")
		}
		if res.UID != "user-1" {
			t.Errorf("expected UID 'user-1', got '%s'", res.UID)
		}
	})

	t.Run("Parse with Mismatched Tags", func(t *testing.T) {
		type MismatchDest struct {
			UID string `json:"identifier"` // doesn't match "id"
		}
		res, err := Parse[Source, MismatchDest]("db", "json", src)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.UID != "" {
			t.Errorf("expected empty UID, got '%s'", res.UID)
		}
	})

	t.Run("Parse Pointer Source", func(t *testing.T) {
		res, err := Parse[*Source, Dest]("db", "json", &src)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.UID != "user-1" {
			t.Errorf("expected UID 'user-1', got '%s'", res.UID)
		}
	})
}

func TestParseAll(t *testing.T) {
	srcSlice := []Source{
		{ID: "1", Name: "Alice", Age: 30},
		{ID: "2", Name: "Bob", Age: 40},
	}

	t.Run("ParseAll Struct Slice", func(t *testing.T) {
		results, err := ParseAll[Source, Dest]("db", "json", srcSlice)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(results) != 2 {
			t.Fatalf("expected 2 results, got %d", len(results))
		}
		if results[0].UID != "1" || results[1].UID != "2" {
			t.Errorf("unexpected values in results")
		}
	})

	t.Run("ParseAll Empty Slice", func(t *testing.T) {
		results, err := ParseAll[Source, Dest]("db", "json", []Source{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(results) != 0 {
			t.Errorf("expected empty result slice")
		}
	})
}
