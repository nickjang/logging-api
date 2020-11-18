const xss = require('xss');

const ProjectsService = {
  getAllProjects(db) {
    return db
      .from('projects')
      .select(
        'projects.id',
        'projects.title',
        'projects.date_created',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', usr.id,
              'email', usr.email,
              'full_name', usr.full_name,
              'nickname', usr.nickname,
              'date_created', usr.date_created,
              'date_modified', usr.date_modified
            )
          ) AS "author"`
        )
      )
      .leftJoin(
        'users AS usr',
        'projects.owner_id',
        'usr.id'
      )
      .groupBy('projects.id', 'usr.id');
  },

  getById(db, id) {
    return ProjectsService.getAllProjects(db)
      .where('projects.id', id)
      .first();
  },

  getLogsForProject(db, project_id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start',
        'logs.stop',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  usr.id,
                  usr.email,
                  usr.full_name,
                  usr.nickname,
                  usr.date_created,
                  usr.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .where('logs.project_id', project_id)
      .leftJoin(
        'users AS usr',
        'logs.user_id',
        'usr.id'
      )
      .groupBy('logs.id', 'usr.id');
  },

  serializeProject(project) {
    const { owner } = project;
    return {
      id: project.id,
      title: xss(project.title),
      date_created: new Date(project.date_created),
      owner: {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        nickname: owner.nickname,
        date_created: new Date(owner.date_created),
        date_modified: new Date(owner.date_modified) || null
      }
    };
  },

  serializeProjectLog(log) {
    const { user } = log;
    return {
      id: log.id,
      project_id: log.project_id,
      start: new Date(log.start),
      stop: new Date(log.stop),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        date_created: new Date(user.date_created),
        date_modified: new Date(user.date_modified) || null
      },
    };
  },
};

module.exports = ProjectsService;
