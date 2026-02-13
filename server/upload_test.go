package main

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func createMultipartFile(t *testing.T, fieldName, fileName string, content []byte) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatalf("creating form file: %v", err)
	}
	if _, err := part.Write(content); err != nil {
		t.Fatalf("writing file content: %v", err)
	}
	writer.Close()
	return body, writer.FormDataContentType()
}

// Minimal valid PDF header.
var minimalPDF = []byte("%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF")

func TestUpload_ValidPDF(t *testing.T) {
	router, _ := setupTestRouter(t)

	body, ct := createMultipartFile(t, "file", "test.pdf", minimalPDF)
	req := httptest.NewRequest(http.MethodPost, "/documents", body)
	req.Header.Set("Content-Type", ct)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var doc Document
	if err := json.Unmarshal(w.Body.Bytes(), &doc); err != nil {
		t.Fatalf("unmarshalling response: %v", err)
	}
	if doc.Filename != "test.pdf" {
		t.Errorf("expected filename test.pdf, got %s", doc.Filename)
	}
	if doc.ContentType != "application/pdf" {
		t.Errorf("expected content type application/pdf, got %s", doc.ContentType)
	}
	if doc.Status != StatusPending {
		t.Errorf("expected status pending, got %s", doc.Status)
	}
	if doc.DiskFilename == "" {
		t.Error("expected non-empty disk_filename")
	}
}

func TestUpload_InvalidContentType(t *testing.T) {
	router, _ := setupTestRouter(t)

	body, ct := createMultipartFile(t, "file", "notes.txt", []byte("hello world this is a plain text file"))
	req := httptest.NewRequest(http.MethodPost, "/documents", body)
	req.Header.Set("Content-Type", ct)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("expected 415, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpload_MissingFile(t *testing.T) {
	router, _ := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/documents", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}
