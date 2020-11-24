BEGIN;

TRUNCATE
  logs,
  projects,
  users
  RESTART IDENTITY CASCADE;

INSERT INTO users (email, full_name, nickname, password)
VALUES
  ('user1', 'user 1', null, '$2a$12$lHK6LVpc15/ZROZcKU00QeiD.RyYq5dVlV/9m4kKYbGibkRc5l4Ne'),
  ('user2', 'user 2', 'user', '$2a$12$VQ5HgWm34QQK2rJyLc0lmu59cy2jcZiV6U1.bE8rBBnC9VxDf/YQO'),
  ('user3', 'user 3', '3', '$2a$12$2fv9OPgM07xGnhDbyL6xsuAeQjAYpZx/3V2dnu0XNIR27gTeiK2gK');

INSERT INTO projects (title, owner_id)
VALUES
  ('First project', 1),
  ('Second project', 2),
  ('Third project', 3),
  ('Fourth project', 3);

INSERT INTO logs (project_id, user_id)
VALUES
  (1,1),
  (1,3),
  (1,3),
  (1,1),
  (2,1),
  (2,3),
  (3,2),
  (3,3),
  (2,3),
  (3,2),
  (2,1),
  (2,2),
  (2,3),
  (1,2),
  (1,1),
  (2,2),
  (2,2);

COMMIT;
