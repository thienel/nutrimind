package service

// PolicyRule represents a Casbin policy rule
type PolicyRule struct {
	Role   string `json:"role"`
	Path   string `json:"path"`
	Method string `json:"method"`
}

// RoleLink represents a role hierarchy link
type RoleLink struct {
	Child  string `json:"child"`
	Parent string `json:"parent"`
}

// AuthorizationService defines authorization operations
type AuthorizationService interface {
	// Enforce checks if a role has access to a path with a method
	Enforce(role, path, method string) (bool, error)

	// Policy CRUD
	GetAllPolicies() ([]PolicyRule, error)
	AddPolicy(rule PolicyRule) (bool, error)
	RemovePolicy(rule PolicyRule) (bool, error)

	// Role Hierarchy CRUD
	GetAllRoles() ([]RoleLink, error)
	AddRoleLink(child, parent string) (bool, error)
	RemoveRoleLink(child, parent string) (bool, error)

	// Query permissions for a specific role
	GetPermissionsForRole(role string) ([]PolicyRule, error)
}
