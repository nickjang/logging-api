const LogsService = {
  getById(db, user_id, id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        'logs.format_min',
        'logs.format_sec',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.user_id', user_id)
      .andWhere('logs.id', id)
      .first();
  },
  getByRange(db, user_id, start, end) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        'logs.format_min',
        'logs.format_sec',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.user_id', user_id)
      .andWhere((builder) => {
        builder.whereBetween('logs.start_time', [start, end]);
        builder.orWhereBetween('logs.end_time', [start, end]);
      })
      // get logs started before range, but still running during
      .orWhere((builder) => {
        builder.whereNull('logs.end_time');
        builder.andWhere('logs.start_time', '<', start);
      })
      .orderBy('logs.start_time', 'desc');
  },
  getBySelectors(db, user_id, selectors) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start_time',
        'logs.end_time',
        'logs.project_id',
        'logs.format_min',
        'logs.format_sec',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .where('logs.user_id', user_id)
      .andWhere((builder) => {
        for (const projectId in selectors) {
          builder.orWhere((projectBuilder) => {
            projectBuilder.where('logs.project_id', projectId);
            // if selecting all project logs, continue to next project
            if (selectors[projectId][0] === 'project') return;

            projectBuilder.andWhere((selectorBuilder) => {
              for (const selector of selectors[projectId]) {
                selectorBuilder.whereBetween('logs.start_time', selector);
                selectorBuilder.orWhereBetween('logs.end_time', selector);
              }
            });
          });
        }
      })
      .orderBy('logs.start_time');
  },
  insertProjectLog(db, user_id, newLog) {
    return db
      .insert(newLog)
      .into('logs')
      .returning('*')
      .then(([log]) => log)
      .then(log =>
        LogsService.getById(db, user_id, log.id)
      );
  },
  endProjectLog(db, user_id, log_id, end_time) {
    return db
      .update({ end_time: end_time })
      .from('logs')
      .where('logs.user_id', user_id)
      .andWhere('logs.id', log_id)
      .returning('*')
      .then(([log]) => log)
      .then(log =>
        LogsService.getById(db, user_id, log.id)
      );
  },
  updateFormat(db, user_id, ids, format_min, format_sec) {
    return db
      .update({ format_min, format_sec })
      .from('logs')
      .whereIn('logs.id', ids)
      .andWhere('logs.user_id', user_id)
      .returning('*')
      .then(logs =>
        Promise.all(
          logs.map(log => LogsService.getById(db, user_id, log.id))
        )
      );
  },
  serializeLog(log) {
    const { user } = log;
    return {
      id: log.id,
      project_id: log.project_id,
      start_time: new Date(log.start_time),
      end_time: log.end_time ? new Date(log.end_time) : null,
      format: {
        minutes: Number.isInteger(log.format_min) ? log.format_min : null,
        seconds: Number.isInteger(log.format_sec) ? log.format_sec : null
      },
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        date_created: new Date(user.date_created),
        date_modified: user.date_modified ? new Date(user.date_modified) : null
      },
    };
  },
  formatStartEndTimes(start, end) {
    start = (new Date(start)).toISOString();
    end = new Date(end);

    // end time is not inclusive
    end.setHours(0, 0, 0, -1);
    end = end.toISOString();
    return [start, end];
  }
};

module.exports = LogsService;
