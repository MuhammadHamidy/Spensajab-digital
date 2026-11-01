package uper

import (
	"context"
	"strconv"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) GetUsers(ctx context.Context, token string, search string, page, perPage int) (*client.GeneralResponse, error) {
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
			"search":   search,
			"page":     strconv.Itoa(page),
			"per_page": strconv.Itoa(perPage),
		}).
		SetResult(&result).
		Get(apiPath + "/users")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get users")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) CreateUser(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/users")

	if err != nil {
		return nil, errors.Wrap(err, "failed to create user")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetUser(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/users/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to get user")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateUser(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Put(apiPath + "/users/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to update user")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) DeleteUser(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Delete(apiPath + "/users/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to delete user")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateUserStatus(ctx context.Context, token, uuid string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Put(apiPath + "/users/" + uuid + "/status")

	if err != nil {
		return nil, errors.Wrap(err, "failed to update user status")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GenerateUsername(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/users/generate-username")

	if err != nil {
		return nil, errors.Wrap(err, "failed to generate username")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) UpdateMyProfile(ctx context.Context, token string, body map[string]interface{}) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/users/me/profiles")

	if err != nil {
		return nil, errors.Wrap(err, "failed to update my profile")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) ImportUsers(ctx context.Context, token, filePath string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token)

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetFile("file", filePath).
		SetResult(&result).
		Post(apiPath + "/users/import")

	if err != nil {
		return nil, errors.Wrap(err, "failed to import users")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetLdapUsers(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/users/ldap")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get ldap users")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
