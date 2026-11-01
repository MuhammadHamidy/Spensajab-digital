package validation

import (
    "fmt"
    "regexp"
    "strings"

    "github.com/go-playground/locales/en"
    ut "github.com/go-playground/universal-translator"
    enTranslations "github.com/go-playground/validator/v10/translations/en"
    "github.com/go-playground/validator/v10"
    "github.com/google/uuid"
    "github.com/facerec/facerec-be/libraries/errors"
)

var Validate *validator.Validate
var Translator ut.Translator

func init() {
    Validate = validator.New()

    enLocale := en.New()
    uni := ut.New(enLocale, enLocale)
    tr, found := uni.GetTranslator("en")
    if found {
        Translator = tr
        _ = enTranslations.RegisterDefaultTranslations(Validate, Translator)
    }
    _ = RegisterDefaultValidators(Validate)
}

func RegisterDefaultValidators(v *validator.Validate) error {
    if err := v.RegisterValidation("uuid", func(fl validator.FieldLevel) bool {
        val := fl.Field().String()
        if val == "" {
            return true 
        }
        _, err := uuid.Parse(val)
        return err == nil
    }); err != nil {
        return err
    }

    if err := v.RegisterValidation("password", func(fl validator.FieldLevel) bool {
        val := fl.Field().String()
        if len(val) < 8 {
            return false
        }
        hasUpper, _ := regexp.MatchString(`[A-Z]`, val)
        hasLower, _ := regexp.MatchString(`[a-z]`, val)
        hasDigit, _ := regexp.MatchString(`[0-9]`, val)
        return hasUpper && hasLower && hasDigit
    }); err != nil {
        return err
    }

    return nil
}

func RegisterCustom(fn func(*validator.Validate) error) error {
    if Validate == nil {
        Validate = validator.New()
    }
    return fn(Validate)
}

func TranslateValidationErrors(err error) string {
    if err == nil {
        return ""
    }
    if ve, ok := err.(validator.ValidationErrors); ok {
        parts := make([]string, 0, len(ve))
        for _, fe := range ve {
            if Translator != nil {
                parts = append(parts, fe.Translate(Translator))
            } else {
                parts = append(parts, fmt.Sprintf("%s %s", fe.Field(), fe.Tag()))
            }
        }
        return strings.Join(parts, "; ")
    }
    return err.Error()
}

func ValidateStruct(s interface{}) *errors.AppError {
    if Validate == nil {
        Validate = validator.New()
    }

    if err := Validate.Struct(s); err != nil {
        msg := TranslateValidationErrors(err)
        if msg == "" {
            msg = err.Error()
        }
        return errors.BadRequest(msg)
    }

    return nil
}
