package idp

import (
	"context"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/facerec/facerec-be/libraries/idp/client"
	"github.com/facerec/facerec-be/libraries/idp/client/uper"
)

type (
	Institution struct {
		Id       string
		Settings Setting
	}

	Setting struct {
		Url              string `json:"url"`
		IdpKey           string `json:"idp_key"`
		IdentityProvider struct {
			Url     string            `json:"url"`
			Headers map[string]string `json:"headers"`
		} `json:"identity_provider"`
	}

	IDP struct {
		db          *pgxpool.Pool
		institution sync.Map
	}

	IDPProvider interface {
		GetIDP(ctx context.Context, InstitutionId string) (client.IDP, error)
	}
)

func NewIDP(db *pgxpool.Pool) *IDP {
	return &IDP{
		db:          db,
		institution: sync.Map{},
	}
}

func (i *IDP) GetIDP(ctx context.Context, InstitutionId string) (client.IDP, error) {
	rawVal, ok := i.institution.Load(InstitutionId)
	if !ok {
		institution, err := i.findInstitutionByCode(ctx, InstitutionId)
		if err != nil {
			return nil, err
		}

		idp, err := i.chooseIDP(institution.Settings)
		if err != nil {
			return nil, err
		}

		i.institution.Store(InstitutionId, idp)
		return idp, nil
	}

	provider, ok := rawVal.(client.IDP)
	if !ok {
		return nil, client.ErrInvalidType
	}

	return provider, nil
}

func (i *IDP) chooseIDP(setting Setting) (client.IDP, error) {
	switch setting.IdpKey {
	case "central":
		return uper.NewIdp(setting.IdpKey, setting.IdentityProvider.Url, setting.IdentityProvider.Headers), nil
	default:
		return nil, client.ErrNotImplemented
	}
}

func (i *IDP) findInstitutionByCode(ctx context.Context, id string) (*Institution, error) {
	const query = `
		SELECT id, settings FROM auth.institutions WHERE id=$1 LIMIT 1;
	`

	rows, err := i.db.Query(ctx, query, id)
	if err != nil {
		return nil, err
	}

	return pgx.CollectOneRow(rows, pgx.RowToAddrOfStructByName[Institution])
}
