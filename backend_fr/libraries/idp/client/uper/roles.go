package uper

import (
	"context"
	"strconv"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) GetRoles(ctx context.Context, token string, search string, page int) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetQueryParams(map[string]string{
			"search": search,
			"page":   strconv.Itoa(page),
		}).
		SetResult(&result).
		Get(apiPath + "/roles")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get roles")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) CreateRole(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/roles")

	if err != nil {
		return nil, errors.Wrap(err, "failed to create role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/roles/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to get role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateRole(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Put(apiPath + "/roles/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to update role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) DeleteRole(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Delete(apiPath + "/roles/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to delete role")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
