package uper

import (
	"context"

	"github.com/pkg/errors"
	"github.com/facerec/facerec-be/libraries/idp/client"
)

func (i *Idp) Login(ctx context.Context, username, password string) (*client.LoginResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.LoginResponse
	resp, err := request.
		SetBody(map[string]string{
			"username": username,
			"password": password,
		}).
		SetResult(&result).
		Post(apiPath + "/auth/login")

	if err != nil {
		return nil, errors.Wrap(err, "failed to login")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) Logout(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/auth/logout")

	if err != nil {
		return nil, errors.Wrap(err, "failed to logout")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) ForgotPassword(ctx context.Context, email string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(map[string]string{"email": email}).
		SetResult(&result).
		Post(apiPath + "/auth/password/forgot")

	if err != nil {
		return nil, errors.Wrap(err, "failed to request password reset")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) ResetPassword(ctx context.Context, token, email, password, confirmation string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(map[string]string{
			"token":                 token,
			"email":                 email,
			"password":              password,
			"password_confirmation": confirmation,
		}).
		SetResult(&result).
		Post(apiPath + "/auth/password/reset")

	if err != nil {
		return nil, errors.Wrap(err, "failed to reset password")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) ChangeMyPassword(ctx context.Context, token, current, new, confirmation string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(map[string]string{
			"current_password":          current,
			"new_password":              new,
			"new_password_confirmation": confirmation,
		}).
		SetResult(&result).
		Post(apiPath + "/auth/me/password/change")

	if err != nil {
		return nil, errors.Wrap(err, "failed to change password")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) ChangeUserPassword(ctx context.Context, token, username, password, confirmation string) (*client.GeneralResponse, error) {
	request := i.client.R().
		SetContext(ctx).
		SetAuthToken(token).
		SetHeader("Content-Type", "application/json")

	if i.customHeaders != nil {
		request.SetHeaders(i.customHeaders)
	}

	var result client.GeneralResponse
	resp, err := request.
		SetBody(map[string]string{
			"username":              username,
			"password":              password,
			"password_confirmation": confirmation,
		}).
		SetResult(&result).
		Post(apiPath + "/auth/password/change")

	if err != nil {
		return nil, errors.Wrap(err, "failed to change user password")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetMe(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/auth/me")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get user data")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetMyApplications(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/auth/me/applications")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get my applications")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) StartImpersonation(ctx context.Context, token, uuid string) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/auth/impersonate/start/" + uuid)

	if err != nil {
		return nil, errors.Wrap(err, "failed to start impersonation")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) LeaveImpersonation(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/auth/impersonate/leave")

	if err != nil {
		return nil, errors.Wrap(err, "failed to leave impersonation")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) LogoutDevices(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Post(apiPath + "/auth/devices/logout")

	if err != nil {
		return nil, errors.Wrap(err, "failed to logout devices")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetActiveDevices(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/auth/devices/active")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get active devices")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}

func (i *Idp) GetActiveImpersonations(ctx context.Context, token string) (*client.GeneralResponse, error) {
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
		Get(apiPath + "/auth/devices/active/impersonate")

	if err != nil {
		return nil, errors.Wrap(err, "failed to get active impersonations")
	}
	if resp.IsError() {
		return nil, client.NewHTTPError(resp.StatusCode(), resp.Body())
	}
	return &result, nil
}
