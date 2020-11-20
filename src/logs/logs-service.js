const xss = require('xss');

const LogsService = {
  getById(db, id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  users.id,
                  users.email,
                  users.full_name,
                  users.nickname,
                  users.date_created,
                  users.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.id', id)
      .first();
  },
  getByRange(db, start, end) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  users.id,
                  users.email,
                  users.full_name,
                  users.nickname,
                  users.date_created,
                  users.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where((builder) =>
        builder
          .where('logs.start_time', '>=', start)
          .where('logs.start_time', '<', end)
      )
      .groupBy('logs.project_id', 'logs.id', 'users.id');
  },
  getBySelectors(db, selectors) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  users.id,
                  users.email,
                  users.full_name,
                  users.nickname,
                  users.date_created,
                  users.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where((projectBuilder) => {
        let projectId = null;
        for (projectId in selectors) {
          projectBuilder.orWhere((selectorBuilder) => {
            selectorBuilder.where('logs.project_id', projectId);

            let selector = null;
            for (selector in selectors[projectId]) {
              selectorBuilder.whereBetween('logs.start_time', selector);
            }
          });
        }
      })
      .groupBy('logs.id', 'users.id')
      .orderBy('logs.start_time', 'desc');
  },
  insertLog(db, newLog) {
    return db
      .insert(newLog)
      .into('logs')
      .returning('*')
      .then(([log]) => log)
      .then(log =>
        LogsService.getById(db, log.id)
      );
  },
  serializeLog(log) {
    const { user } = log;
    return {
      id: log.id,
      project_id: log.project_id,
      start_time: new Date(log.start_time),
      end_time: new Date(log.end_time) || null,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        date_created: new Date(user.date_created),
        date_modified: new Date(user.date_modified) || null
      },
    };
  }
};

module.exports = LogsService;
