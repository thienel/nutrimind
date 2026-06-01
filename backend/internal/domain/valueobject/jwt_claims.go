package valueobject

// JWTClaims holds parsed JWT claims
type JWTClaims struct {
	UserID   uint
	GoogleID string
	Role     string
}
