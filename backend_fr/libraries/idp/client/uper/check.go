package uper

import (
	"context"
	"encoding/json"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

type CheckSessionResponse struct {
	User               client.UserResponse `json:"user"`
	AccessToken        string              `json:"access_token"`
	TokenType          string              `json:"token_type"`
	ExpiresIn          int                 `json:"expires_in"`
	FormattedExpiresIn string              `json:"formatted_expires_in"`
	SsoSessionValid    bool                `json:"sso_session_valid"`
	ApplicationRoles   ApplicationRoles    `json:"application_roles"`
}

type ApplicationRoles struct {
	Role       Role       `json:"role"`
	EntityType EntityType `json:"entity_type"`
	EntityId   string     `json:"entity_id"`
}

type Role struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
}

type EntityType struct {
	Name string `json:"name"`
	Code string `json:"code"`
}

const clientSessionPath = "/client/session"

func (i *Idp) Check(ctx context.Context, token string) (*client.AuthSession, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var responses client.GeneralResponse
	response, err := request.SetResult(&responses).
		Post(apiPath + clientSessionPath)
	if nil != err {
		return nil, errors.Wrapf(err, "failed to check session")
	}

	responseBody := response.Body()
	if response.IsError() {
		return nil, client.NewHTTPError(response.StatusCode(), responseBody)
	}

	var sessionResponse CheckSessionResponse
	err = json.Unmarshal(responses.Data, &sessionResponse)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal Response")
	}

	return &client.AuthSession{
		Sub:         sessionResponse.User.Code,
		Type:        sessionResponse.TokenType,
		AccessToken: sessionResponse.AccessToken,
		ExpiresIn:   sessionResponse.ExpiresIn,
	}, nil
}
