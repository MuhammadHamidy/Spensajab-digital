CREATE TABLE auth.sessions
(
    session_id        VARCHAR(128) PRIMARY KEY,
    institution_id   uuid not null references auth.institutions(id),
    user_id           VARCHAR(128) NOT NULL,
    external_subject  VARCHAR(128) NOT NULL,
    roles             JSONB         NOT NULL,
    access_token      TEXT         NOT NULL,
    expires_at        TIMESTAMPTZ  NOT NULL
);
