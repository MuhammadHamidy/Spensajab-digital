package domain

import (
	"context"
	"io"
)

type ImportErrorDetail struct {
	Row    int    `json:"row"`
	Column string `json:"column"`
	Error  string `json:"error"`
}

type ImportResultResponse struct {
	TotalRows int                  `json:"total_rows"`
	Inserted  int                  `json:"inserted"`
	Failed    int                  `json:"failed"`
	Errors    []ImportErrorDetail `json:"errors,omitempty"`
}

type UseCase interface {
	ImportStudentsFromExcel(ctx context.Context, fileReader io.Reader) (*ImportResultResponse, error)
	ImportTeachersFromExcel(ctx context.Context, fileReader io.Reader) (*ImportResultResponse, error)
	GenerateStudentTemplateExcel() ([]byte, error)
	GenerateTeacherTemplateExcel() ([]byte, error)
}
