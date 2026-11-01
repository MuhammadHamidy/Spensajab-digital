package mocks

import (
"context"

"github.com/facerec/facerec-be/libraries/idp/client"
"github.com/stretchr/testify/mock"
)

type IDPProviderMock struct {
mock.Mock
}

func (m *IDPProviderMock) GetIDP(ctx context.Context, institutionId string) (client.IDP, error) {
args := m.Called(ctx, institutionId)
if args.Get(0) == nil {
return nil, args.Error(1)
}
return args.Get(0).(client.IDP), args.Error(1)
}
