package main

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type Document struct {
	ID              string         `json:"id"`
	Filename        string         `json:"filename"`
	DiskFilename    string         `json:"disk_filename"`
	ContentType     string         `json:"content_type"`
	FileSize        int64          `json:"file_size"`
	Status          DocumentStatus `json:"status"`
	RejectionReason *string        `json:"rejection_reason,omitempty"`
	UploadedAt      time.Time      `json:"uploaded_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

const documentColumns = `id, filename, disk_filename, content_type, file_size, status, rejection_reason, uploaded_at, updated_at`

func scanDocument(row interface{ Scan(...interface{}) error }, d *Document) error {
	return row.Scan(&d.ID, &d.Filename, &d.DiskFilename, &d.ContentType, &d.FileSize, &d.Status, &d.RejectionReason, &d.UploadedAt, &d.UpdatedAt)
}

func GetDocument(db *sql.DB, id string) (*Document, error) {
	var d Document
	err := db.QueryRow(
		`SELECT `+documentColumns+` FROM documents WHERE id = $1`, id,
	).Scan(&d.ID, &d.Filename, &d.DiskFilename, &d.ContentType, &d.FileSize, &d.Status, &d.RejectionReason, &d.UploadedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

type ListOptions struct {
	Page    int
	PerPage int
	Status  string
	Query   string
}

type ListResult struct {
	Documents []Document `json:"documents"`
	Total     int        `json:"total"`
	Page      int        `json:"page"`
	PerPage   int        `json:"per_page"`
}

func ListDocuments(db *sql.DB, opts ListOptions) (*ListResult, error) {
	if opts.Page < 1 {
		opts.Page = 1
	}
	if opts.PerPage < 1 {
		opts.PerPage = 20
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if opts.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, opts.Status)
		argIdx++
	}
	if opts.Query != "" {
		conditions = append(conditions, fmt.Sprintf("filename ILIKE $%d", argIdx))
		args = append(args, "%"+opts.Query+"%")
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	err := db.QueryRow("SELECT COUNT(*) FROM documents"+where, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	query := `SELECT ` + documentColumns + ` FROM documents` + where + ` ORDER BY uploaded_at DESC`
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, opts.PerPage, (opts.Page-1)*opts.PerPage)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := []Document{}
	for rows.Next() {
		var d Document
		if err := scanDocument(rows, &d); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &ListResult{
		Documents: docs,
		Total:     total,
		Page:      opts.Page,
		PerPage:   opts.PerPage,
	}, nil
}

func UpdateDocumentStatus(db *sql.DB, id string, status DocumentStatus, rejectionReason *string) (*Document, error) {
	var d Document
	err := db.QueryRow(
		`UPDATE documents SET status = $1, rejection_reason = $2, updated_at = now()
		 WHERE id = $3
		 RETURNING `+documentColumns,
		status, rejectionReason, id,
	).Scan(&d.ID, &d.Filename, &d.DiskFilename, &d.ContentType, &d.FileSize, &d.Status, &d.RejectionReason, &d.UploadedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func InsertDocument(db *sql.DB, doc *Document) error {
	return db.QueryRow(
		`INSERT INTO documents (filename, disk_filename, content_type, file_size, status)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, rejection_reason, uploaded_at, updated_at`,
		doc.Filename, doc.DiskFilename, doc.ContentType, doc.FileSize, doc.Status,
	).Scan(&doc.ID, &doc.RejectionReason, &doc.UploadedAt, &doc.UpdatedAt)
}
