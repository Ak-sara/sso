export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    createdAt: Date;
}

export interface Client {
    client_id: string;
    client_secret: string;
    name: string;
    redirect_uris: string[];
    allowed_scopes: string[];
    created_at: Date;
}

export interface AuthorizationCode {
    code: string;
    client_id: string;
    identity_id: string; // Changed from user_id to identity_id
    redirect_uri: string;
    scope: string;
    expires_at: Date;
    code_challenge?: string;
    code_challenge_method?: string;
}

export interface AccessToken {
    token: string;
    client_id: string;
    identity_id: string; // Changed from user_id to identity_id
    scope: string;
    expires_at: Date;
}

export interface RefreshToken {
    token: string;
    client_id: string;
    identity_id: string; // Changed from user_id to identity_id
    expires_at: Date;
}

