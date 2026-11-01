package uper

import (
	"context"
	"strconv"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) GetApplications(ctx context.Context, token string, search string, page int) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/applications")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get applications")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) CreateApplication(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/applications")

	if err != nil {
		return nil, errors.Wrap(err, "failed to create application")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetApplication(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/applications/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to get application")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateApplication(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Put(apiPath + "/applications/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to update application")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) DeleteApplication(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Delete(apiPath + "/applications/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to delete application")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateApplicationStatus(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Put(apiPath + "/applications/" + uuid + "/status")

	if err != nil {
		return nil, errors.Wrap(err, "failed to update application status")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetApplicationUsers(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/applications/" + uuid + "/users")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get application users")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
