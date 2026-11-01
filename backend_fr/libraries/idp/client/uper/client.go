package uper

import (
	"context"
	"encoding/json"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) ClearSession(ctx context.Context, token string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if token != "" {
		request.SetAuthToken(token)
	}
	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetResult(&result).
		Post(apiPath + "/client/session/clear")

	if err != nil {
		return nil, errors.Wrap(err, "failed to clear session")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetUserByCode(ctx context.Context, token, code string) (*client.UserResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json").
		SetAuthToken(token)

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetResult(&result).
		Get(apiPath + "/client/users/" + code + "/code")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get user by code")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}

	var userResponse client.UserResponse
	if err := json.Unmarshal(result.Data, &userResponse); err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal user data")
	}

	return &userResponse, nil
}

func (i *Idp) GetUserByUuid(ctx context.Context, uuid string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetResult(&result).
		Get(apiPath + "/client/users/" + uuid + "/uuid")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get user by uuid")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpsertUser(ctx context.Context, body map[string]interface{}) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(body).
		SetResult(&result).
		Post(apiPath + "/client/users")

	if err != nil {
		return nil, errors.Wrap(err, "failed to upsert user")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
