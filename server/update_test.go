package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUpdate_Verify(t *testing.T) {
	router, db := setupTestRouter(t)

	var id string
	err := db.QueryRow(
		`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		"test.pdf", "test.pdf", "application/pdf", 1024, "pending",
	).Scan(&id)
	if err != nil {
		t.Fatalf("inserting test document: %v", err)
	}

	body := strings.NewReader(`{"status": "verified"}`)
	req := httptest.NewRequest(http.MethodPatch, "/documents/"+id, body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var doc Document
	json.Unmarshal(w.Body.Bytes(), &doc)
	if doc.Status != StatusVerified {
		t.Errorf("expected status verified, got %s", doc.Status)
	}
}

func TestUpdate_Reject(t *testing.T) {
	router, db := setupTestRouter(t)

	var id string
	db.QueryRow(
		`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		"test.pdf", "test.pdf", "application/pdf", 1024, "pending",
	).Scan(&id)

	body := strings.NewReader(`{"status": "rejected", "rejection_reason": "Blurry scan"}`)
	req := httptest.NewRequest(http.MethodPatch, "/documents/"+id, body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var doc Document
	json.Unmarshal(w.Body.Bytes(), &doc)
	if doc.Status != StatusRejected {
		t.Errorf("expected status rejected, got %s", doc.Status)
	}
	if doc.RejectionReason == nil || *doc.RejectionReason != "Blurry scan" {
		t.Errorf("expected rejection reason 'Blurry scan', got %v", doc.RejectionReason)
	}
}

func TestUpdate_RejectWithoutReason(t *testing.T) {
	router, db := setupTestRouter(t)

	var id string
	db.QueryRow(
		`INSERT INTO documents (filename, disk_filename, content_type, file_size, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		"test.pdf", "test.pdf", "application/pdf", 1024, "pending",
	).Scan(&id)

	body := strings.NewReader(`{"status": "rejected"}`)
	req := httptest.NewRequest(http.MethodPatch, "/documents/"+id, body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdate_InvalidStatus(t *testing.T) {
	router, _ := setupTestRouter(t)

	body := strings.NewReader(`{"status": "approved"}`)
	req := httptest.NewRequest(http.MethodPatch, "/documents/00000000-0000-0000-0000-000000000000", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdate_NotFound(t *testing.T) {
	router, _ := setupTestRouter(t)

	body := strings.NewReader(`{"status": "verified"}`)
	req := httptest.NewRequest(http.MethodPatch, "/documents/00000000-0000-0000-0000-000000000000", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}
