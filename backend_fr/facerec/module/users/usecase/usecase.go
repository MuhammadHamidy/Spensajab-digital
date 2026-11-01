package usecase

import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"github.com/facerec/facerec-be/libraries/idp"
	"github.com/facerec/facerec-be/facerec/module/users/domain"
)

var _ domain.UseCase = (*UseCase)(nil)

// UseCase implements the logic for users module.
type UseCase struct {
	repository domain.UserRepository
	idp        idp.IDPProvider
	tracer     trace.Tracer	
}

// NewUseCase creates a new instance of Users UseCase.
func NewUseCase(repository domain.UserRepository, idp idp.IDPProvider) *UseCase {
	return &UseCase{
		repository: repository,
		idp:        idp,
		tracer:     otel.Tracer("users"),
	}
}
