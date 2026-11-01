package uper

import (
	"github.com/go-resty/resty/v2"
)

const apiPath = "/api/v1"

type Idp struct {
	key           string
	client        *resty.Client
	customHeaders map[string]string
}

func NewIdp(key, baseUrl string, customHeaders map[string]string) *Idp {
	return &Idp{
		key: key,
		client: resty.New().
			SetBaseURL(baseUrl).
			SetDebug(true).
			EnableTrace(),
		customHeaders: customHeaders,
	}
}

func (i *Idp) Key() string {
	return i.key
}
