package main

import (
	"database/sql"
	"time"
)

type Document struct {
	ID          string         `json:"id"`
	Filename    string         `json:"filename"`
	ContentType string         `json:"content_type"`
	FileSize    int64          `json:"file_size"`
	Status      DocumentStatus `json:"status"`
	UploadedAt  time.Time      `json:"uploaded_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func InsertDocument(db *sql.DB, doc *Document) error {
	return db.QueryRow(
		`INSERT INTO documents (filename, content_type, file_size, status)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, uploaded_at, updated_at`,
		doc.Filename, doc.ContentType, doc.FileSize, doc.Status,
	).Scan(&doc.ID, &doc.UploadedAt, &doc.UpdatedAt)
}
