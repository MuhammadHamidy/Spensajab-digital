package types

import "math"

// Pagination holds the pagination request and response data.
type Pagination struct {
	Page       int   `json:"page" query:"page"`
	Size       int   `json:"size" query:"size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// GetOffset returns the offset for database queries.
func (p *Pagination) GetOffset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Size < 1 {
		p.Size = 10
	}
	return (p.Page - 1) * p.Size
}

// GetLimit returns the limit for database queries.
func (p *Pagination) GetLimit() int {
	if p.Size < 1 {
		p.Size = 10
	}
	return p.Size
}

// SetTotal sets the total count and calculates total pages.
func (p *Pagination) SetTotal(total int64) {
	p.Total = total
	if p.Size > 0 {
		p.TotalPages = int(math.Ceil(float64(total) / float64(p.Size)))
	}
}
