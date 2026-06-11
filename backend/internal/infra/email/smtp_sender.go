package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
)

// Sender abstracts outgoing email delivery.
type Sender interface {
	SendWelcomeEmail(to, displayName string) error
}

// smtpSender sends email via STARTTLS on port 587 (compatible with Gmail App Passwords).
type smtpSender struct {
	host     string
	port     int
	username string
	password string
	from     string
}

// NewSMTPSender returns a Sender backed by an SMTP server.
// from defaults to username when left empty.
func NewSMTPSender(host string, port int, username, password, from string) Sender {
	if from == "" {
		from = username
	}
	return &smtpSender{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
	}
}

func (s *smtpSender) SendWelcomeEmail(to, displayName string) error {
	subject := "Chào mừng đến với NutriMind!"
	body := fmt.Sprintf(
		"Xin chào %s,\r\n\r\nChào mừng bạn đến với NutriMind! Tài khoản của bạn đã được tạo thành công.\r\n\r\nTrân trọng,\r\nĐội ngũ NutriMind",
		displayName,
	)
	msg := fmt.Sprintf(
		"From: NutriMind <%s>\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		s.from, to, subject, body,
	)
	return s.send(to, []byte(msg))
}

func (s *smtpSender) send(to string, msg []byte) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)

	conn, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	defer conn.Close()

	if err := conn.StartTLS(&tls.Config{ServerName: s.host}); err != nil {
		return fmt.Errorf("smtp starttls: %w", err)
	}

	if err := conn.Auth(smtp.PlainAuth("", s.username, s.password, s.host)); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}

	if err := conn.Mail(s.from); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := conn.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}

	w, err := conn.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err = w.Write(msg); err != nil {
		return fmt.Errorf("smtp write: %w", err)
	}
	return w.Close()
}

// noopSender discards all emails silently (used when SMTP is not configured).
type noopSender struct{}

func NewNoopSender() Sender { return &noopSender{} }

func (s *noopSender) SendWelcomeEmail(_, _ string) error { return nil }
