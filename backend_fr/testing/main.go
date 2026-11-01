package main

import (
	"fmt"
	"log"
	"net/http"
	"text/template"
	"time"
)

type PageData struct {
	Title       string
	Message     string
	Cookies     map[string]string
	RedirectURL string
	Count       int
}

func main() {
	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/redirect", redirectHandler)
	http.HandleFunc("/set-cookie", setCookieHandler)
	http.HandleFunc("/clear-cookie", clearCookieHandler)
	http.HandleFunc("/target", targetHandler)

	fmt.Println("Server starting on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8083", nil))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	cookies := getCookies(r)
	visitCount := getVisitCount(cookies)

	data := PageData{
		Title:   "Cookie & Redirect Demo",
		Message: "Welcome to the demonstration page!",
		Cookies: cookies,
		Count:   visitCount,
	}

	renderTemplate(w, "index.html", data)
}

func redirectHandler(w http.ResponseWriter, r *http.Request) {
	redirectURL := r.URL.Query().Get("url")
	if redirectURL == "" {
		redirectURL = "/target"
	}

	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

func setCookieHandler(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	value := r.URL.Query().Get("value")

	if name == "" {
		name = "demo_cookie"
	}
	if value == "" {
		value = fmt.Sprintf("cookie_value_%d", time.Now().Unix())
	}

	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   3600, // 1 hour
		HttpOnly: true,
		Secure:   false, // Set to true when using HTTPS
		SameSite: http.SameSiteLaxMode,
	})

	// Increment visit counter
	visitCount := getVisitCount(getCookies(r))
	visitCount++

	http.SetCookie(w, &http.Cookie{
		Name:     "visit_count",
		Value:    fmt.Sprintf("%d", visitCount),
		Path:     "/",
		MaxAge:   3600,
		HttpOnly: true,
	})

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func clearCookieHandler(w http.ResponseWriter, r *http.Request) {
	cookies := r.Cookies()
	for _, cookie := range cookies {
		http.SetCookie(w, &http.Cookie{
			Name:     cookie.Name,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func targetHandler(w http.ResponseWriter, r *http.Request) {
	cookies := getCookies(r)
	data := PageData{
		Title:   "Target Page",
		Message: "You have been redirected to this target page!",
		Cookies: cookies,
		Count:   getVisitCount(cookies),
	}

	renderTemplate(w, "target.html", data)
}

func getCookies(r *http.Request) map[string]string {
	cookies := make(map[string]string)
	for _, cookie := range r.Cookies() {
		cookies[cookie.Name] = cookie.Value
	}
	return cookies
}

func getVisitCount(cookies map[string]string) int {
	if count, exists := cookies["visit_count"]; exists {
		if parsed, err := fmt.Sscanf(count, "%d", new(int)); err == nil && parsed == 1 {
			var result int
			fmt.Sscanf(count, "%d", &result)
			return result
		}
	}
	return 0
}

func renderTemplate(w http.ResponseWriter, templateName string, data PageData) {
	tmpl, err := template.ParseFiles(templateName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error parsing template: %v", err), http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, data)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error executing template: %v", err), http.StatusInternalServerError)
		return
	}
}
