package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestList_Empty(t *testing.T) {
	router, _ := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/documents", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result ListResult
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("unmarshalling response: %v", err)
	}
	if len(result.Documents) != 0 {
		t.Errorf("expected empty list, got %d documents", len(result.Documents))
	}
	if result.Total != 0 {
		t.Errorf("expected total 0, got %d", result.Total)
	}
}

func TestList_Populated(t *testing.T) {
	router, db := setupTestRouter(t)

	// Insert two test documents directly.
	for _, name := range []string{"first.pdf", "second.pdf"} {
		_, err := db.Exec(
			`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5)`,
			name, name, "application/pdf", 1024, "pending",
		)
		if err != nil {
			t.Fatalf("inserting test document: %v", err)
		}
	}

	req := httptest.NewRequest(http.MethodGet, "/documents", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result ListResult
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("unmarshalling response: %v", err)
	}
	if result.Total != 2 {
		t.Errorf("expected total 2, got %d", result.Total)
	}
	if len(result.Documents) != 2 {
		t.Errorf("expected 2 documents, got %d", len(result.Documents))
	}
	// Most recent first.
	if result.Documents[0].Filename != "second.pdf" {
		t.Errorf("expected first document to be second.pdf, got %s", result.Documents[0].Filename)
	}
}

func TestList_StatusFilter(t *testing.T) {
	router, db := setupTestRouter(t)

	db.Exec(`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5)`,
		"pending.pdf", "pending.pdf", "application/pdf", 1024, "pending")
	db.Exec(`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5)`,
		"verified.pdf", "verified.pdf", "application/pdf", 1024, "verified")

	req := httptest.NewRequest(http.MethodGet, "/documents?status=verified", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	var result ListResult
	json.Unmarshal(w.Body.Bytes(), &result)
	if result.Total != 1 {
		t.Errorf("expected total 1, got %d", result.Total)
	}
	if len(result.Documents) > 0 && result.Documents[0].Filename != "verified.pdf" {
		t.Errorf("expected verified.pdf, got %s", result.Documents[0].Filename)
	}
}
