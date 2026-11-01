package middleware

import (
"github.com/facerec/facerec-be/libraries/idp"
"github.com/gofiber/fiber/v2"
"github.com/jackc/pgx/v5/pgxpool"
"github.com/redis/go-redis/v9"
)

const (
authCookieKey   = "access_token"
PrefixAuthToken = "auth:token:"
)

type (
AuthorizationMiddleware struct {
idp   idp.IDPProvider
db    *pgxpool.Pool
cache redis.UniversalClient
}
)

func NewAuthorizationMiddleware(idp idp.IDPProvider, db *pgxpool.Pool, cache redis.UniversalClient) *AuthorizationMiddleware {
return &AuthorizationMiddleware{idp: idp, db: db, cache: cache}
}

const (
XTokenKey        = "X-Token"
XUserIdKey       = "X-User-Id"
XExternalSubject = "X-External-Subject"
XGroupKey        = "X-Group"
XInstitutionId   = "X-Institution-Id"
)

// Authenticate is temporarily bypassed for development.
// All requests are allowed through without a token.
func (a *AuthorizationMiddleware) Authenticate(scopes ...string) fiber.Handler {
return func(c *fiber.Ctx) error {
// NOTE: Token validation is disabled for development.
// TODO: Re-enable before production deployment.
c.Locals(XUserIdKey, "dev-user")
c.Locals(XTokenKey, "")
c.Locals(XExternalSubject, "")
c.Locals(XInstitutionId, "")
c.Locals(XGroupKey, []string{})
return c.Next()
}
}
