const express = require('express');
const path = require('path');
const LogsService = require('./logs-service');
const ProjectsService = require('../projects/projects-service');
const { requireAuth } = require('../middleware/jwt-auth');

const logsRouter = express.Router();
const jsonBodyParser = express.json();

logsRouter
  .route('/')
  .all(requireAuth)
  .all(jsonBodyParser)
  .get((req, res, next) => {
    // get logs within a range of dates
    if (req.query.filter === 'range') {
      let { start, end } = req.query;
      if (!start)
        return res.status(404).json({
          error: 'Missing \'start\' in request query'
        });
      if (!end)
        return res.status(404).json({
          error: 'Missing \'end\' in request query'
        });

      try {
        start = (new Date(start)).toISOString();
        end = (new Date(end)).toISOString();
      } catch (e) {
        return res.status(404).json({
          error: 'Given invalid range value(s).'
        });
      }

      LogsService.getByRange(
        req.app.get('db'),
        req.user.id,
        start,
        end
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }

    // get logs filtered by project and date selectors
    if (req.query.filter === 'projects-and-ranges') {
      // selectors is an object where keys are the projects' ids and 
      // the values are the projects' list of day ranges
      const selectors = req.query.selectors;

      if (!selectors)
        return res.status(404).json({
          error: 'Missing \'selectors\' in request query'
        });

      // check if each project exists
      Promise.all(
        Object.keys(selectors).map(projectId =>
          ProjectsService.getById(db, projectId)
        ))
        .then(projects => {
          for (let project of projects)
            if (!project)
              return res.status(404).json({
                error: 'One or more of the projects selected don\'t exist'
              });
        })
        .catch(next);

      LogsService.getBySelectors(
        req.app.get('db'),
        req.user.id,
        selectors
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }
  })
  .post((req, res, next) => {
    const { project_id, start_time } = req.body;
    const newLog = { project_id, start_time };

    for (const [key, value] of Object.entries(newLog))
      if (value == null)
        return res.status(400).json({
          error: `Missing '${key}' in request body`
        });

    // check if valid value
    try {
      newLog.start_time = (new Date(start_time)).toISOString();
    } catch (e) {
      return res.status(404).json({
        error: 'Given invalid start time.'
      });
    }

    newLog.user_id = req.user.id;

    LogsService.insertProjectLog(
      req.app.get('db'),
      req.user.id,
      newLog
    )
      .then(log => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${log.id}`))
          .json(LogsService.serializeLog(log));
      })
      .catch(next);
  });

logsRouter
  .route('/:log_id')
  .all(requireAuth)
  .all(checkLogExists)
  .all(jsonBodyParser)
  .patch((req, res, next) => {
    let { end_time } = req.body;

    if (!end_time)
      return res.status(404).json({
        error: 'Missing \'end_time\' in request body'
      });

    // check if valid value
    try {
      end_time = (new Date(end_time)).toISOString();
    } catch (e) {
      return res.status(404).json({
        error: 'Given invalid end time.'
      });
    }

    LogsService.endProjectLog(
      req.app.get('db'),
      req.user.id,
      req.params.log_id,
      end_time
    )
      .then(log => {
        res
          .status(200)
          .location(path.posix.join(req.originalUrl, `/${log.id}`))
          .json(LogsService.serializeLog(log));
      })
      .catch(next);
  });

async function checkLogExists(req, res, next) {
  try {
    const log = await LogsService.getById(
      req.app.get('db'),
      req.user.id,
      req.params.log_id
    );
    if (!log)
      return res.status(404).json({
        error: 'Log doesn\'t exist'
      });

    res.log = log;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = logsRouter;
