package usecase

import (

	// Note: Previous `cmd/serve.go` used `github.com/beruang/framework/common/logger`.
	// But `templates` used `github.com/facerec/facerec-be/libraries/helper` for trace ID and `zerolog` for logging.
	// I should be consistent with the detected `cmd/serve.go` or `rules`.
	// The `rules` say "MUST use zerolog". `github.com/beruang/framework/common/logger` is likely a wrapper.
	// `templates` use `zerolog.Ctx(ctx)`. I will use `zerolog` and `otel`.
	// Also need domain package.

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"github.com/facerec/facerec-be/facerec/module/roles/domain"
)

var _ domain.UseCase = (*UseCase)(nil)

// UseCase implements the logic for roles management.
type UseCase struct {
	repository domain.RoleRepository
	tracer     trace.Tracer
}

// NewUseCase creates a new instance of Roles UseCase.
func NewUseCase(repository domain.RoleRepository) *UseCase {
	return &UseCase{
		repository: repository,
		tracer:     otel.Tracer("roles"),
	}
}
