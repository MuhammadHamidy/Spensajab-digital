package uper

import (
	"context"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

type RefreshResponse struct {
	Success            bool   `json:"success"`
	AccessToken        string `json:"access_token"`
	TokenType          string `json:"token_type"`
	ExpiresIn          int    `json:"expires_in"`
	FormattedExpiresIn string `json:"formatted_expires_in"`
}

const refreshPath = "/auth/refresh"

func (i *Idp) Refresh(ctx context.Context, token string) (*client.AuthSession, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	var responses RefreshResponse
	response, err := request.SetResult(&responses).
		Post(apiPath + refreshPath)
	if nil != err {
		return nil, errors.Wrapf(err, "failed to check session")
	}

	responseBody := response.Body()
	if response.IsError() {
		return nil, client.NewHTTPError(response.StatusCode(), responseBody)
	}

	return &client.AuthSession{
		// Sub is not returned by refresh endpoint and not needed for session update in middleware
		Type:        responses.TokenType,
		AccessToken: responses.AccessToken,
		ExpiresIn:   responses.ExpiresIn,
	}, nil
}
