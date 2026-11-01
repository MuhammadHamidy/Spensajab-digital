package uper

import (
	"context"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) GetUserRoles(ctx context.Context, token string, params map[string]string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetQueryParams(params).
		SetResult(&result).
		Get(apiPath + "/user-roles")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get user roles")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) AssignUserRole(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(body).
		SetResult(&result).
		Post(apiPath + "/user-roles")

	if err != nil {
		return nil, errors.Wrap(err, "failed to assign user role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) RemoveUserRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetResult(&result).
		Delete(apiPath + "/user-roles/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to remove user role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
