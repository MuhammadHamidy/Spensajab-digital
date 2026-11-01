package middleware

import (
	"encoding/json"
	"time"
)

type (
	UserRoles struct {
		InstitutionId   string    `db:"institution_id" json:"institution_id"`
		SessionId       string    `db:"session_id" json:"session_id"`
		UserId          string    `db:"user_id" json:"user_id"`
		ExternalSubject string    `db:"external_subject" json:"external_subject"`
		Roles           []Roles   `db:"roles" json:"roles"`
		AccessToken     string    `db:"access_token" json:"access_token"`
		ExpiresAt       time.Time `db:"expires_at" json:"expires_at"`
	}
	Roles struct {
		Groups      []string `json:"groups"`
		RoleId      string   `json:"role_id"`
		RoleName    string   `json:"role_name"`
		Permissions []string `json:"permissions"`
	}
)

func (r *UserRoles) MarshalBinary() ([]byte, error) {
	return json.Marshal(r)
}

func (r *UserRoles) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, r)
}

func (r *UserRoles) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return json.Unmarshal(v, r)
	case string:
		return json.Unmarshal([]byte(v), r)
	case nil:
		return nil
	default:
		b, _ := json.Marshal(v)
		return json.Unmarshal(b, r)
	}
}

func (r *Roles) MarshalBinary() ([]byte, error) {
	return json.Marshal(r)
}

func (r *Roles) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, r)
}

func (r *UserRoles) Groups() []string {
	var groups []string
	for _, role := range r.Roles {
		groups = append(groups, role.Groups...)
	}

	return groups
}

func (r *UserRoles) Permissions() []string {
	var permissions []string
	for _, role := range r.Roles {
		permissions = append(permissions, role.Permissions...)
	}

	return permissions
}
