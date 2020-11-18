CREATE TYPE project_category AS ENUM (
  'Listicle',
  'How-to',
  'News',
  'Interview',
  'Story'
);

ALTER TABLE blogful_projects
  ADD COLUMN
    style project_category;
